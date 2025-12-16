# import packages
import os
import pandas as pd
from dateutil.relativedelta import relativedelta
import plotly
import plotly.express as px
import plotly.graph_objs as go
import json
from collections import OrderedDict
import colour_scales as funcs_cnames
import matplotlib as mpl
import numpy as np
from PIL import ImageColor
import textwrap
import constant
from config import BLOB_CONNECTION
import re
from azure.storage.blob import generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta  


# Functions for formatting and cleaning input data
# ----------------------------------------------------------
def clean_documentname(name):
    date_pattern = r'\s([0-9]{4}\-[0-9]{2}\-[0-9]{2})'
    rev_pattern = r'\sRev[0-9]+|\.[0-9]+'
    newname = re.sub(date_pattern, '', name)
    newname = re.sub(rev_pattern, '', newname)
    return newname


def get_pdf_url_with_blob_sas_token(blob_name):
    """ get url to to a pdf by generating a SAS token using credentials

    Args:
        blob_name: name of file in blob storage to use. Note that this file MUST be the relative path of the file, to
                   the contained defined in config.CONTAINER_NAME

    Returns:

    """
    blob_sas_token = generate_blob_sas(account_name=BLOB_CONNECTION["ACCOUNT_NAME"],
                                       container_name=BLOB_CONNECTION["CONTAINER_NAME"],
                                       blob_name=blob_name,
                                       account_key=BLOB_CONNECTION["ACCOUNT_KEY"],
                                       content_type="application/pdf",
                                       permission=BlobSasPermissions(read=True),
                                       expiry=datetime.utcnow() + timedelta(hours=1)
                                       )

    blob_url_with_blob_sas_token = f"https://{BLOB_CONNECTION['ACCOUNT_NAME']}.blob.core.windows.net/" \
                                   f"{BLOB_CONNECTION['CONTAINER_NAME']}/{blob_name}?{blob_sas_token}"

    return blob_url_with_blob_sas_token


def get_long_tbl_sl_links_df(dependency_mapper_output_df):
    """ get all the cols starting with 'SL' from the main df and change it to a long format resulting in the
        following cols - ('ID', 'sl_document', 'link_relevancy')

    Args:
        dependency_mapper_output_df (df): dataframe read from the sql table

    Returns:
        df : dataframe with the following cols - ('ID', 'sl_document', 'link_relevancy')
    """

    # get all the columns starting with 'SL' (SL document cols)
    sliced_change_links_df = dependency_mapper_output_df.loc[:, dependency_mapper_output_df.columns.str.startswith('SL')]
    # change data type to float
    sliced_change_links_df = sliced_change_links_df.astype(float)
    # get the ID column
    sliced_change_links_df['ID'] = dependency_mapper_output_df[['ID']]
    # set the ID (row id) as the sliced df index
    sliced_change_links_df.set_index('ID', inplace=True)
    # drop all NaN rows
    sliced_change_links_df.dropna(how='all', inplace=True)
    # drop rows with 0 relevancy for all SL docs as they are non-relevant links
    sliced_change_links_df = sliced_change_links_df[(sliced_change_links_df.T != 0).any()]
    # convert to a long table of sl docs and link value
    long_tbl_sl_links_df = sliced_change_links_df.unstack().reset_index()
    # rename col names to readable ones
    long_tbl_sl_links_df.rename(columns={"level_1": "ID", "level_0": "sl_document", 0: "link_relevancy"}, inplace=True)
    # change the _ to . and insert a space after the first 3 characters for the document names to show the
    # actual file names (e.g: from SLM_1_05_03 to SLM 1.05.03)
    long_tbl_sl_links_df['sl_document'] = long_tbl_sl_links_df['sl_document'].str.replace('_', '.')
    long_tbl_sl_links_df['sl_document'] = long_tbl_sl_links_df['sl_document'].str[:3] + ' ' \
                                          + long_tbl_sl_links_df['sl_document'].str[4:]

    return long_tbl_sl_links_df


def get_rel_sl_links(dependency_mapper_output_df, long_tbl_sl_links_df):
    """for the main dataframe read from sql, creates new columns 'strongLinks' and 'softLinks' with values of relevant
    and maybe relevant SL doc links (respectively) as a concatenated string separated by <br> tag
    (e.g: SLM 1.05.03<br>SLM 1.06.01), as they are to be displayed on new lines on the UI

    Args:
        dependency_mapper_output_df (df): dataframe read from the sql table
        long_tbl_sl_links_df (df):        dataframe sliced from the main df and converted to a long format with the
                                          following cols - ('ID', 'sl_document', 'link_relevancy')

    Returns:
        df: new dataframe with all cols from the main df and updated with additional col 'strongLinks' and 'softLinks'
    """
    # group by the ID and join the relevant SL doc names with a line break as they are
    # to be displayed on new lines in the UI col
    mask_relevant_links = long_tbl_sl_links_df['link_relevancy'] == 1
    grouped_strong_links_df = long_tbl_sl_links_df[mask_relevant_links].groupby('ID')\
        .agg({'sl_document': lambda x: "<br>".join(x)}).reset_index()

    grouped_strong_links_df.rename(columns={"sl_document": "strongLinks"}, inplace=True)

    # group by the ID and join the maybe relevant SL doc names with a line break as they are
    # to be displayed on new lines in the UI col
    mask_maybe_relevant_links = long_tbl_sl_links_df['link_relevancy'] == 0.5
    grouped_soft_links_df = long_tbl_sl_links_df[mask_maybe_relevant_links].groupby('ID')\
        .agg({'sl_document': lambda x: "<br>".join(x)}).reset_index()

    grouped_soft_links_df.rename(columns={"sl_document": "softLinks"}, inplace=True)
    merged_strong_soft_links_df = pd.merge(grouped_strong_links_df, grouped_soft_links_df, on='ID', how='outer')
    merged_strong_soft_links_df.fillna('', inplace=True)

    # merge with the original dataframe on the ID column 
    final_output_df = pd.merge(dependency_mapper_output_df, merged_strong_soft_links_df, on='ID', how='left')

    # replace the null values in sl_document col to empty strings
    final_output_df['strongLinks'].fillna('', inplace=True)
    final_output_df['softLinks'].fillna('', inplace=True)

    return final_output_df


def get_final_df_for_viz(dependency_mapper_output_df, long_tbl_sl_links_df):
    """generate df for sankey and treemap viz with all the cols from the main df except for the ones starting with 'SL'
       and following additional cols ('sl_document', 'link_relevancy')

    Args:
        dependency_mapper_output_df (df): main dataframe read from the sql table
        long_tbl_sl_links_df (df):        dataframe sliced from the main df and converted to a long format with the
                                          following cols - ('ID', 'sl_document', 'link_relevancy')
    
    Returns:
        df: slice of the main dataframe merged with the long_tbl_sl_links_df
    """
    # select all col names except ones starting with 'SL'
    cols = [col for col in dependency_mapper_output_df.columns if col[:3] != 'SL']

    # get all column values except ones starting with 'SL'
    slice_output_for_plots = dependency_mapper_output_df[cols]

    # merge the sliced df and the  long_tbl_sl_links_df to get following additional cols for each row
    # ('sl_document', 'link_relevancy')
    final_output_for_viz_df = pd.merge(slice_output_for_plots, long_tbl_sl_links_df, on='ID', how='left')

    # remove null values from sl_document col and link_relevancy col
    final_output_for_viz_df = final_output_for_viz_df.dropna(axis=0, subset=['sl_document'])
    final_output_for_viz_df = final_output_for_viz_df.dropna(axis=0, subset=['link_relevancy'])

    # get only the relevant and maybe relevant changes for the viz pages
    mask = final_output_for_viz_df['rel_model_pred'] >= 0.5
    final_output_for_viz_df = final_output_for_viz_df.loc[mask]

    return final_output_for_viz_df


def get_status(dependency_mapper_output_df):
    """for the main df, creates a new column named status and fills it with either
       reviewed/addressed/not started based on the True/False values in 
       the reviewed/addressed cols in the df

    Args:
        dependency_mapper_output_df (df): main dataframe read from sql table

    Returns:
        df: main dataframe updated with a new status column
    """
    # where 'reviewed' col is True, assign status value as 'reviewed'
    mask_reviewed = (dependency_mapper_output_df['reviewed'] == True)
    dependency_mapper_output_df.loc[mask_reviewed, 'status'] = 'reviewed'

    # where 'addressed' col is True, assign status value as 'addressed'
    mask_addressed = (dependency_mapper_output_df['addressed'] == True)
    dependency_mapper_output_df.loc[mask_addressed, 'status'] = 'addressed'

    # where 'validatedNotRelevant' col is True, assign status value as 'not relevant'
    mask_addressed = (dependency_mapper_output_df['validatedNotRelevant'] == True)
    dependency_mapper_output_df.loc[mask_addressed, 'status'] = 'not relevant'

    # fill all null values in status to 'not started'
    dependency_mapper_output_df['status'].fillna('not started', inplace=True)

    return dependency_mapper_output_df


def create_context(change, previous, after):
    """creating new column, 'change_context' where the previous and the next paragraph values are concatenated
       with the change text

    Args:
        change (str): changeText column value of the final_output_df
        previous (str): previousParagraph column value of the final_output_df
        after (str): nextParagraph column value of the final_output_df

    Returns:
        str: new value for the change_context column where values from previousParagraph and nextParagraph are
             concatenated to the changeText
    """
    new_text = '<strong><i>Previous:</i></strong><br>' + str(previous) + '<br><br><strong>Change:</strong><br>' \
               + str(change) + '<br><br><strong><i>Next:</i></strong><br>' + str(after)

    return new_text


# Functions to filter input data for dropdowns/tables/viz etc.
# ----------------------------------------------------------------
def get_gov_df(output_df):
    """creating dataframe for gov document type

    Args:
        output_df (df): final dataframe used for different pages on app
    Returns:
        df: dataframe with all records of gov documentType
    """
    # creating dataframe for gov document type
    gov_df = output_df.loc[output_df['documentType'].str.startswith('gov')]
    return gov_df


def get_nongov_df(output_df):
    """creating dataframe for non gov document type

    Args:
        output_df (df): final dataframe used for different pages on app

    Returns:
        df: dataframe with all records of non gov documentType
    """
    # creating dataframe for non gov document type
    nongov_df = output_df.loc[output_df['documentType'].str.startswith('non')]
    return nongov_df


def get_unique_file_names(df):
    """
    returns unique file names from the input dataframe

    :param 
    df: (dataframe) - name of the dataframe

    :return: (list) - unique document names
    """
    return list(set(df.documentName))


# Calc stats for landing page
# ----------------------------------------------------
def get_recent_changes_stats(final_output_df):
    """returns a dictionary with stats of most recent changes to be displayed on the landing page

    Args:
        final_output_df: (dataframe) - the dataframe with all change and SL link details

    Returns:
        list of dictionaries with details for top 3 new change stats (doc name, revision date, rel/maybe rel/not rel)
    """
    stats_df = final_output_df.copy()
    # change the currentRevision col type to datetime and sort in descending order
    stats_df['currentRevision'] = pd.to_datetime(stats_df["currentRevision"], dayfirst=True)

    stats_df.sort_values(by='currentRevision', ascending=False, inplace=True)

    # get the stats (relevant, not relevant, maybe relevant) for latest 3 docs
    top_docs_stats = []
    for _ in range(3):
        # filter df on latest date of current revision
        mask = stats_df['currentRevision'] == max(stats_df['currentRevision'])
        top_doc_df = stats_df[mask]

        # get the document name and revision date
        doc = top_doc_df['documentName'].iloc[0]
        rev_date = top_doc_df['currentRevision'].iloc[0]
        rev_formatted_date = rev_date.strftime('%d/%m/%Y')

        # get the count of rel (1.0)/maybe rel (0.5)/not rel (0.0) by reading the 'rel_model_pred' column
        not_relevant = (top_doc_df['rel_model_pred'] == 0).sum()
        maybe_relevant = (top_doc_df['rel_model_pred'] == 0.5).sum()
        relevant = (top_doc_df['rel_model_pred'] == 1).sum()

        # append the data in the form of a dictionary for each doc in the list
        top_docs_stats.append(
            {
                'doc': doc,
                'rev_date': rev_date,
                'rev_formatted_date': rev_formatted_date,
                'not_relevant': not_relevant,
                'maybe_relevant': maybe_relevant,
                'relevant': relevant
            }
        )
        # removing the doc for which the stats have been read
        stats_df = stats_df.drop(stats_df[mask].index)

    return top_docs_stats


def get_backlog_stats(final_output_df):
    """ returns a dictionary with stats of the current backlog (addressed/reviewed/not started)

    Args:
        final_output_df: final_output_df: (dataframe) - the dataframe with all change and SL link details

    Returns: dictionary with count of addressed/reviewed/not started changes
    """
    # filter df on a start date from constant.py to calculate the backlog stats
    start_dt_for_backlog_stats = datetime.strptime(constant.START_DT_FOR_BACKLOG_STATS, '%d/%m/%Y')

    mask_start_dt = pd.to_datetime(final_output_df['currentRevision'], dayfirst=True) >= start_dt_for_backlog_stats
    final_output_df = final_output_df.loc[mask_start_dt]

    not_started = (final_output_df['status'].str.lower() == 'not started').sum()
    reviewed = (final_output_df['status'].str.lower() == 'reviewed').sum()
    addressed = (final_output_df['status'].str.lower() == 'addressed').sum() 
    
    reviewed_stats = {
                    'not started': not_started,
                    'reviewed': reviewed,
                    'addressed': addressed
                }
    return reviewed_stats


# Functions for routes
# -----------------------------------------
def get_docs_by_name_and_recency(doc_type, docs, recency, final_output_df):
    """filters the dataframe based on document type, document and recency value selected by the user
    Args:
        doc_type (string): document type
        docs (string): document name
        recency (string): recency period
        final_output_df (df): dataframe used for the Detect Changes tab
    Returns:
        (df): dataframe filtered by document type and recency
    """
    # if recency is historical, get the date before 2 years
    _, historical = get_recency_historical(recency)

    # filtering as per the selected document name and with current revision within the recency period
    if doc_type.lower() == 'legislation':
        doc_type_df = get_gov_df(final_output_df)
    else:
        doc_type_df = get_nongov_df(final_output_df)

    temp_df = doc_type_df.copy()
    temp_df['currentRevision'] = pd.to_datetime(temp_df['currentRevision'],  dayfirst=True)

    doc_df = temp_df.loc[temp_df.documentName == docs]
    if not historical:
        # convert the recency period (1 month, 2 years, etc) into a date
        recency_date = get_recency_date(recency)
        doc_df = doc_df.loc[doc_df.currentRevision > recency_date]

    return doc_df


def get_section_options(doc_type, docs, recency, final_output_df):
    """filters the dataframe based on values selected by the user and returns list of sections to be displayed in the
       section dropdown

    Args:
        doc_type (string): document type
        docs (string): document name
        recency (string): recency period
        final_output_df (df): dataframe used for the Detect Changes tab

    Returns:
        (dict): dictionary with keys as section numbers and values as section titles
    """
    # get the dataframe filtered by doc type, doc name and recency
    doc_df = get_docs_by_name_and_recency(doc_type, docs, recency, final_output_df)

    # get the page number and section title from the filtered dataframe
    sections = get_sections(doc_df)

    return sections


def get_doc_changes(doc_type, docs, recency, section, rel_type, final_output_df):
    """filters the dataframe based on values selected by the user and returns  the change details/key metrics/pdf
       viewer values for the Detect Changes tab

    Args:
        doc_type (string): document type
        docs (string): document name
        recency (string): recency period
        section: section title
        rel_type: change relevance 
        final_output_df (df): dataframe used for the Detect Changes tab

    Returns:
        (dict): dictionary with keys as change details/key metrics/pdf viewer details and respective values
    """
    # get the dataframe filtered by doc type, doc name and recency
    recency_doc_df = get_docs_by_name_and_recency(doc_type, docs, recency, final_output_df)

    recency_doc_df['currentRevision'] = recency_doc_df['currentRevision'].dt.strftime(constant.DT_FORMAT)
    recency_doc_df['currentRevision'] = recency_doc_df['currentRevision'].astype(str)

    # get the full doc for the pdf viewer
    if doc_type.lower() == 'legislation':
        gov_df = final_output_df.loc[final_output_df.documentType == 'gov']
        full_doc_df = gov_df.loc[gov_df.documentName == docs]
        
    else:
        nongov_df = final_output_df.loc[final_output_df.documentType == 'non-gov']
        full_doc_df = nongov_df.loc[nongov_df.documentName == docs]

    if section != 'All':
        section_doc_df = recency_doc_df[recency_doc_df.sectionTitle == section]
    else:
        section_doc_df = recency_doc_df

    # get the details depending on the relevance value chosen by the user
    doc_df = relevance_secs(section_doc_df, rel_type)

    # instead of 0, 0.5 and 1, get the corresponding relevant, not relevant and
    # maybe relevant tags from constant.REL_TYPES
    doc_df["Relevance"] = doc_df.rel_model_pred.apply(
        lambda i: constant.REL_TYPES[2] if i == 0.5 else constant.REL_TYPES[int(i)])

    # Key Metrics
    num_tot_changes = len(recency_doc_df)
    num_sec_changes = len(section_doc_df)
    num_rel_sec_changes = len(relevance_secs(section_doc_df, 'relevant'))


    # PDF Viewer

    # get the latest currentRevision date for the dataframe
    current_revs = list(set(full_doc_df.currentRevision))
    current_rev1 = max([item[:10] for item in current_revs], key=lambda d: datetime.strptime(d, constant.DT_FORMAT))

    current_rev = max([item for item in current_revs], key=lambda d: datetime.strptime(d, constant.DT_FORMAT))

    # use the currentRevision date to get previousRevision date, current revision number and previous revision number
    mask_current_revision = full_doc_df['currentRevision'] == str(current_rev)

    current_rev_number = full_doc_df[mask_current_revision]['revisionNumber'].iloc[0]
    previous_rev1 = full_doc_df[mask_current_revision].previousRevision.iloc[0]
    prev_rev_number = full_doc_df[mask_current_revision].prevRevisionNumber.iloc[0].strip()

    # join the name of the document and date for gov docs and name of document, revision number and date for nongov docs
    if doc_type.lower() == 'legislation':
        current_rev_pdf = ' '.join([str(docs), current_rev1])
        previous_rev_pdf = ' '.join([str(docs), previous_rev1])
        folder = BLOB_CONNECTION["GOV_MOUNT_PATH"]
    else:
        current_rev_pdf = ' '.join([str(docs), current_rev_number, current_rev1])
        previous_rev_pdf = ' '.join([str(docs), prev_rev_number, previous_rev1])
        folder = BLOB_CONNECTION["NONGOV_MOUNT_PATH"]

    current_rev_pdf = ''.join([current_rev_pdf, '.pdf'])
    current_rev_pdf = get_pdf_url_with_blob_sas_token(os.path.join(folder, current_rev_pdf))
    previous_rev_pdf = ''.join([previous_rev_pdf, '.pdf'])
    previous_rev_pdf = get_pdf_url_with_blob_sas_token(os.path.join(folder, previous_rev_pdf))

    # Detailed Table heading
    if section == 'all':
        table_heading = 'Document Changes Detailed Table'
    else:
        table_heading = f'Section {section} Changes Detailed Table'

    # Detailed Table
    # added additional col names (currentRevision, Relevance, strongLinks, softLinks, pageNumber and status)
    # for gov docs (legislation) and revisionNumber additionally only for non gov docs
    # !!! if this set of cols are modified, make sure 'ID'and 'status' are always the last two columns in detail_df as
    # it impacts the code in the change_functions.js on the way the status dropdown is displayed on the UI !!!!
    detail_df = doc_df[['currentRevision', 'sectionTitle', 'pageNumber', 'change_context', 'Relevance', 'strongLinks',
                        'softLinks', 'ID', 'status']]

    # for non-gov documents, insert the revisionNumber column in the first position
    if doc_type != 'Legislation':
        detail_df.insert(0, 'revisionNumber', doc_df['revisionNumber'])

    # sort dataframe by currentRevision and ID in descending order and convert to a list of values
    detail_df = detail_df.sort_values(by=['currentRevision', 'ID'], ascending = [False, False])
    detail_df = detail_df.values.tolist()

    info = 'block'

    return {'doc_type': doc_type, 'num_sec_changes': num_sec_changes, 'num_tot_changes': num_tot_changes, 'info': info,
            'current_rev': current_rev1, 'previous_rev': previous_rev1, 'current_rev_pdf': current_rev_pdf,
            'previous_rev_pdf': previous_rev_pdf, 'detail_df': detail_df, 'table_heading': table_heading,
            'num_rel_sec_changes': num_rel_sec_changes, 'status': constant.STATUS}


def update_status_on_submit(results, final_output_df):
    """Depending on the value chosen by the user in the status dropdown, on clicking the Submit button, prepare the
       date to be pushed into the sql db and for updating the final_output_df

    Args:
        results (list of dict): read from the UI, each item in results is a dict of keys 'id' which has the row id
                                to be updated and 'value' which is the status value chosen by the user on Detect
                                Changes page final_output_df (_type_): _description_
        final_output_df: TODO

    Returns:
        db_updates - (list of tuples): list of tuples for db - (row id, col name, value to be set)
        df_updates - (list of tuples): list of tuples for df- (mask, col name, value to be set)
    """
    db_updates = []
    df_updates = []

    now = datetime.now()
    dt_string = now.strftime("%m/%d/%Y %H:%M:%S")

    for row in results:
        mask = final_output_df['ID'] == int(row['id'])
        row['value'] = row['value'].lower()

        if row['value'] == 'not relevant':
            db_updates.append(('validatedNotRelevant', True, row['id']))
            df_updates.append((mask, 'validatedNotRelevant', True))
            df_updates.append((mask, 'status', row['value']))

            db_updates.append(('lastSubmit', dt_string, row['id']))
            df_updates.append((mask, 'lastSubmit', dt_string))

        else:
            existing_value = final_output_df[mask]['status'].values[0]
            if row['value'] != existing_value:
                if row['value'] != 'not started':
                    db_updates.append((row['value'], True, row['id']))
                    df_updates.append((mask, 'status', row['value']))

                    if row['value'] == 'reviewed':
                        db_updates.append(('addressed', False, row['id']))
                        df_updates.append((mask, 'addressed', False))
                    else:
                        db_updates.append(('reviewed', True, row['id']))
                        df_updates.append((mask, 'reviewed', True))

                else:
                    db_updates.append(('addressed', False, row['id']))
                    db_updates.append(('reviewed', False, row['id']))

                    df_updates.append((mask, 'status', 'not started'))
                    df_updates.append((mask, ['reviewed', 'addressed'], False))

                db_updates.append(('lastSubmit', dt_string, row['id']))
                df_updates.append((mask, 'lastSubmit', dt_string))

    return db_updates, df_updates


def format_response_msg_on_submit(response):
    """returns a bool success status and a text message depending on if the update to sql db was a success or a failure
    
    Args:
        response: (boolean) - status returned by the update action on the sql db

    Returns:
        success: (boolean) - True/False depending on whether the sql update was successful
        txt_msg: (string) - A message to be displayed on the UI on clicking the Submit button
    """
    if response:
        now = datetime.now()
        dt_string = now.strftime("%d/%m/%Y %H:%M:%S")
        success = True
        txt_msg = f"Your changes have been saved at {dt_string}"
    else:
        success = False
        txt_msg = "There was an error connecting to the database, the current selections have not been saved."

    return success, txt_msg


def time_metric(time):
    """convert current/previous revision date to day, full month name, year format to be displayed in the Key Metrics
       section e.g 16-11-2015 converted to 16 November 2015

    Args:
        time (string): current/previous revision date

    Returns:
        string: current/previous revision date converted to day, full month name, year format
    """
    # if timestamp present, extract only the date
    if len(time) < 9:
        result = time
    else:
        if len(time) > 14:
            time = time.split(' ')[0]

        # split by '-' or '/' to get the day, month and year
        if "-" in time:
            split_char = "-"
        else:
            split_char = "/"
        year = time.split(split_char)[2]
        month = time.split(split_char)[1]
        day = time.split(split_char)[0]

        # format it as day + full month name + year
        datetime_object = datetime.strptime(month, "%m")
        full_month_name = datetime_object.strftime("%B")
        result = ' '.join([day, full_month_name, str(year)])

    return result


def get_recency_date(recency):
    """ returns a date for a recency period
    
    Args:
        recency: (string) - recency period (1 month, 3 months, 1 year, etc.)

    Returns: (date) - date for the recency period
    """
    # get the number of months/years and the period
    number = int(recency.split()[0])
    period = recency.split()[1]

    # if number is 1, the period is either 'year' or 'month' and for relative delta function,
    # the period has to be a plural (months, years, etc), hence adding an 's' at the end
    if number == 1:
        period = period + 's'
    period_dict = {period: number}

    current_date = datetime.now()
    recency_date = current_date - relativedelta(**period_dict)
    return recency_date


def get_sections(doc_df):
    """ returns unique sections of a document
    
    Args
        doc_df: (dataframe) - gov or non-gov dataframe

    Returns: (dict) - dictionary with keys as section numbers and values as section titles
    """
    # get section title from the dataframe 
    sections_df = doc_df[['sectionTitle']]

    # drop duplicate section titles and sort the index
    sections_df.drop_duplicates(inplace=True)
    sections_df.sort_index(inplace=True)

    # convert to a dictionary with keys as index and values as section titles
    section_dict = sections_df.T.to_dict('list')

    return section_dict


def relevance_secs(df, rel_type):
    """ Return dataframe filtered by change relevance selected by the user on the Detect Changes tab

    Args:
        df: (dataframe) - dataframe filtered by doc type/doc name/recency/section
        rel_type: str, either 'relevant, 'maybe relevant' or 'not relevant'

    Returns: (dataframe) - df filtered on relevance as selected by user
    """
    # (1 - relevant, 0 - not relevant, 0.5 - maybe relevant in df, all - return the input df without filtering)
    if rel_type.lower() == 'relevant':
        rel_df = df[(df['rel_model_pred'] == 1) & (df['status'] != 'not relevant')]
    elif rel_type.lower() == 'maybe relevant':
        rel_df = df[(df['rel_model_pred'] == 0.5) & (df['status'] != 'not relevant')] 
    elif rel_type.lower() == 'not relevant':
        rel_df = df[(df['rel_model_pred'] == 0) | (df['status'] == 'not relevant')]
    else:
        # if user has selected 'all' in the relevance dropdown, return the input df
        rel_df = df

    return rel_df


def get_recency_historical(recency):
    """ check if user has selected receny period as 'Historical' and if yes, set the recency to '2 years'
    as need to select all rows later than this last option in the recency dropdown

    Args:
        recency: (string) - value selected by user from recency dropdown on any of the tabs

    Returns: recency (string) - set as '2 years' if 'Historical' is True
             historical (boolean)     
    """
    historical = False
    # if recency is historical, set recency as 2 years and historical to True
    if recency.lower() == 'historical':
        recency = '2 years'
        historical = True

    return recency, historical


# Functions for viz tabs
# --------------------------------------------------
def get_gov_or_nongov_df_copy(doc_type, gov_viz_df, nongov_viz_df):
    """ returns a copy of the gov_viz_df or nongov_viz_df based on the document type selected by the user

    Args:
        doc_type (string): document type selected from the dropdown (Legislature/Guidance) on golden thread or document
                           map tabs
        gov_viz_df (df): dataframe in the format needed for visualisation filtered for of all gov docs
        nongov_viz_df (df): dataframe in the format needed for visualisation filtered for of all gov docs

    Returns:
        df: copy of gov_viz_df or non_gov_viz_df
    """
    if doc_type.lower() == 'legislation':
        plot_doc_df = gov_viz_df.copy()
    else:
        plot_doc_df = nongov_viz_df.copy()

    return plot_doc_df


def get_relevant_link_rows_for_viz(link_rel_type, plot_doc_df):
    """filters the dataframe according to the link relevancy selected on the golden thread and document map tabs

    Args:
        link_rel_type (string): link relevancy selected by the user on the golden thread and document map tabs
                                (relevant/maybe relevant)
        plot_doc_df (df): dataframe used to plot the viz on these two tabs

    Returns:
        df: datafrme filtered on link relevancy
    """
    link_relevancy = constant.LINK_REL_MAP[link_rel_type]
    plot_doc_df = plot_doc_df.loc[plot_doc_df.link_relevancy == link_relevancy]

    return plot_doc_df


def get_recent_rows_for_viz(recency, plot_doc_df):
    """ filters the dataframe according to the recency selected by the user on the golden thread and document map tabs

    Args:
        recency (string): recency period selected by the user (1 month, 1 year, 2 years, etc)
        plot_doc_df (df): dataframe to be used on the page

    Returns:
        df: datafrme filtered on recency
    """
    # if recency period selected by the user is 'Historical', set the historical variable to True
    _, historical = get_recency_historical(recency)

    if historical:
        # get all rows (historical)
        plot_doc_df = plot_doc_df
    else:
        # get all rows starting from the recency period selected by the user
        # convert the recency period to a date (e.g: 1 month to a date 1 month from now)
        recency_date = get_recency_date(recency)
        plot_doc_df['currentRevision'] = pd.to_datetime(plot_doc_df['currentRevision'], dayfirst=True)
        plot_doc_df = plot_doc_df.loc[(plot_doc_df.currentRevision > recency_date)]

    return plot_doc_df


def plot_treemap(treemap_df):
    """ returns plotly treemap fig converted to a json format
    
    Args:
        treemap_df: (dataframe) - dataframe with details needed for the treemap

    Returns: (json) - treemap fig converted to a json format
    """
    # use a constant parent as 'Sellafield Manuals and Practices' and child data from sellafieldDocument
    # (SL docs) and index (change #) columns
    fig = px.treemap(treemap_df, path=[px.Constant("Sellafield Manuals and Practices"), 'sl_document', 'ID'])
    fig.update_traces(root_color="lightgrey")
    fig.update_layout(margin=dict(t=50, l=25, r=25, b=25))

    # wrap Change text and insert <br> after every 100 characters - this is to make the displayed
    # change text in the treemap box more readable
    treemap_df['changeText'] = treemap_df['changeText'].apply(lambda i: textwrap.wrap(i, width=100))
    treemap_df['changeText'] = treemap_df['changeText'].apply(lambda i: '<br>'.join(i))

    # set hover details
    fig.update(data=[{'customdata': treemap_df[['ID', 'changeText', 'currentRevision', 'pageNumber', 'sectionTitle']],
                      'hovertemplate': 'Change ID: %{customdata[0]}<br>'}
                     ])

    # fill each sector of a treemap with the change text
    fig.update_traces(texttemplate='Change ID: %{customdata[0]}<br>Page Number: '
                                   '%{customdata[3]}<br><br><br><br>%{customdata[1]}')

    fig.update_layout(font_size=14, title_x=0.5, width=1000, height=900)
    return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)


def format_data_for_sankey(plot_doc_df):
    """ returns a dataframe with columns and values suitable for a sankey plot
    
    Args:
        plot_doc_df: (dataframe) - gov/non-gov dataframe with cols needed for the sankey plot

    Returns: (dataframe) - dataframe suitable for a sankey plot
    """
    # count the number of changes from a source document to a target sl document by grouping by file_name
    # and SL_links cols and adding that as a new column
    sankey_df = plot_doc_df.groupby(['documentName', 'sl_document'])['ID'].count().reset_index(name='no_of_changes')

    # add a new col source_id with unique sequential numbers for each document
    sankey_df['source_id'] = sankey_df.groupby('documentName').ngroup()

    # add a new col target_id with unique sequential numbers for each sl document
    # count the number of source documents
    length_of_doc = len(sankey_df.groupby(['documentName']))

    # set target ids for each sl_document starting from a number 1 more than the last source id
    sankey_df['target_id'] = sankey_df.groupby('sl_document').ngroup() + length_of_doc

    return sankey_df


def create_labels(sankey_df):
    """ takes the unique file names and sl links from the dataframe, appends it to a list and returns this list of
        labels for the sankey nodes

    Args:
        sankey_df: (dataframe) - dataframe suitable for a sankey plot
    
    Returns: list of labels for the sankey nodes
    """
    labels = []
    doc_names = sankey_df['documentName'].unique().tolist()
    sl_doc_names = sankey_df['sl_document'].unique().tolist()
    labels.extend(doc_names)
    labels.extend(sl_doc_names)
    return labels


def color_fader(c1, c2, mix=0):
    # for sankey diagram
    # fade (linear interpolate) from color c1 (at mix=0) to c2 (mix=1)
    c1 = np.array(mpl.colors.to_rgb(c1))
    c2 = np.array(mpl.colors.to_rgb(c2))
    return mpl.colors.to_hex((1-mix)*c1 + mix*c2)


def convert_rgba(x):
    # for sankey diagram
    # convert to rgba to change opacity
    rgba = ImageColor.getcolor(x.lower(), "RGB")+(0.6,)
    rgba_text = f'rgba{rgba}'

    return rgba_text


def apply_colour(label, labels_list, colours_list):
    # for sankey diagram
    # function to apply colour
    return colours_list[labels_list.index(label)]


def gen_colour(sankey_df):
    # for sankey diagram
    cnames = funcs_cnames.get_cnames()

    sl_doc_names = sankey_df['sl_document'].unique().tolist()
    sankey_cmaps = [color_fader(cnames['darkslateblue'], cnames['blanchedalmond'],
                                int(ix / len(sl_doc_names))) for ix in range(len(sl_doc_names))]

    sankey_df['link_colours'] = sankey_df['sl_document'].apply(lambda x: apply_colour(x, sl_doc_names, sankey_cmaps))
    sankey_df['link_colours'] = sankey_df['link_colours'].apply(lambda x: convert_rgba(x))
    return sankey_df, sankey_cmaps


def sankey_plot(sankey_df, labels, sankey_cmaps):
    """ generates a sankey plot

    Args:
        sankey_df:      dataframe formatted for a sankey plot
        labels:         list of all source and target nodes
        sankey_cmaps:   list of  color_fader, see gen_colour function
    
    Returns:   sankey plot converted to json format
    """
    doc_names = sankey_df['documentName'].unique().tolist()
    sl_doc_names = sankey_df['sl_document'].unique().tolist()

    # create colours for input document nodes
    node_colours_source = ['#00008B'] * len(doc_names)
    # create colours to match with links
    node_colours_target = sankey_cmaps
    # total
    node_colours = node_colours_source + node_colours_target
    # get the source, target and value for the plot
    source = sankey_df['source_id'].tolist()
    target = sankey_df['target_id'].tolist()
    value = sankey_df['no_of_changes'].tolist()

    # style hover box
    hoverlabel = dict(bgcolor='black',  font=dict(color='white'))

    # plot sankey diagram
    fig = go.Figure(data=[go.Sankey(
                        valueformat=".0f",
                        node=OrderedDict(
                                    pad=35,
                                    thickness=10,
                                    line=dict(color="black", width=0.2),
                                    label=labels,
                                    color=node_colours,
                                    x=[0] * len(doc_names) + [1] * len(sl_doc_names),
                                    y=np.linspace(-0.1, 1, len(node_colours)),
                                    hoverlabel=hoverlabel,
                                    hovertemplate='%{label}<br>Total changes: %{value}<extra></extra>'
                        ),
                        link=OrderedDict(
                                    source=source,
                                    target=target,
                                    value=value,
                                    color=sankey_df['link_colours'].tolist(),
                                    hoverlabel=hoverlabel,
                                    hovertemplate='Source:  %{source.label}<br>Target:  '
                                                  '%{target.label}<br>Changes: %{value}<extra></extra>'
                        )
    )])

    fig.update_layout(font_size=14, title_x=0.5, width=800, height=1000)
    fig.update_traces(node_hoverinfo=None, selector=dict(type='sankey'))

    return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)
