import utils
import pymssql
import pandas as pd
from config import SQL_CONNECTION
import datetime


class DataManager:
    """Class for managing data that the flask web app uses"""
    final_output_df = None
    gov_docs = None
    nongov_docs = None
    gov_viz_df = None
    nongov_viz_df = None
    top_docs_stats = None

    def __init__(self):
        self.update()

    def update(self):
        """ Update all datasets in data manager class"""
        final_output_df, gov_docs, nongov_docs, gov_viz_df, nongov_viz_df, top_docs_stats = self.get_sql_info()
        self.final_output_df = final_output_df
        self.gov_docs = gov_docs
        self.nongov_docs = nongov_docs
        self.gov_viz_df = gov_viz_df
        self.nongov_viz_df = nongov_viz_df
        self.top_docs_stats = top_docs_stats

    @staticmethod
    def get_sql_info():
        """ Get the datasets from the SQL database """
        print(f"RAN background update at: {datetime.datetime.now()}")
        # Load input data from sql db
        dependency_mapper_output_df = DataManager.__get_sql_data(SQL_CONNECTION['TABLE_NAME'])
        # Clean input data - remove null and strip whitespace
        # remove rows where 'documentName' col is null
        dependency_mapper_output_df = dependency_mapper_output_df.dropna(axis=0, subset=['documentName'])
        # remove date and revision number from the documentName column
        dependency_mapper_output_df['documentName'] = dependency_mapper_output_df.apply(
            lambda x: utils.clean_documentname(x['documentName']), axis=1)

        # strip spaces from documentType col
        dependency_mapper_output_df['documentType'] = dependency_mapper_output_df['documentType'].str.strip()
        # replace null values in revsionNumber with empty strings
        dependency_mapper_output_df['revisionNumber'].fillna('', inplace=True)
        dependency_mapper_output_df['prevRevisionNumber'].fillna('', inplace=True)

        # ** Format data for the change tabs and the viz tabs (add cols/ change to long table format) **

        # add a new column - 'status' (depending on the True/False value in 'reviewed' and 'addressed' cols in the db,
        # it will store 'reviewed', 'addressed' or 'not started' values)
        dependency_mapper_output_df = utils.get_status(dependency_mapper_output_df)
        # get all the cols starting with 'SL' from the main df and change it to a long # format resulting in the
        # following cols - ('ID', 'sl_document',#'link_relevancy')
        long_tbl_sl_links_df = utils.get_long_tbl_sl_links_df(dependency_mapper_output_df)
        # add new columns to the main df called strongLinks and softLinks -  add relevant and maybe relevant SL doc
        # links as a concatenated string separated by <br> tag in the respective col (e.g: SLM 1.05.03<br>SLM 1.06.01)
        final_output_df = utils.get_rel_sl_links(dependency_mapper_output_df, long_tbl_sl_links_df)

        # removing values in strongLinks and softLinks column if the change is not relevant (rel_model_pred = 0.0)
        final_output_df['strongLinks'] = final_output_df[['rel_model_pred', 'strongLinks']].apply(
            lambda x: "" if x['rel_model_pred'] < 0.5 else x['strongLinks'], axis=1)
        final_output_df['softLinks'] = final_output_df[['rel_model_pred', 'softLinks']].apply(
            lambda x: "" if x['rel_model_pred'] < 0.5 else x['softLinks'], axis=1)

        # adding new column 'change_context' which will have values from previousParagraph and nextParagraph alongwith
        # the changeText
        final_output_df['change_context'] = \
            final_output_df.apply(lambda x: utils.create_context(x['changeText'], x['previousParagraph'],
                                                                 x['nextParagraph']), axis=1)

        #  ** generate df for sankey and treemap viz by removing the cols starting with 'SL' and instead having **
        # them in a long table format
        final_output_for_viz_df = utils.get_final_df_for_viz(dependency_mapper_output_df, long_tbl_sl_links_df)

        # ** Filter input data for specific features for tabs **
        # creating dataframe for gov and nongov document type for detect_changes tab
        gov_df = utils.get_gov_df(final_output_df)
        nongov_df = utils.get_nongov_df(final_output_df)

        # creating dataframe for gov and nongov document type for viz tabs
        gov_viz_df = utils.get_gov_df(final_output_for_viz_df)
        nongov_viz_df = utils.get_nongov_df(final_output_for_viz_df)

        # getting the unique gov and non-gov file names for document dropdown
        gov_docs = utils.get_unique_file_names(gov_df)
        nongov_docs = utils.get_unique_file_names(nongov_df)

        # ** Calc stats for landing page **

        # get recent change stats for top (last changed) 3 documents for the landing page
        top_docs_stats = utils.get_recent_changes_stats(final_output_df)

        return final_output_df, gov_docs, nongov_docs, gov_viz_df, nongov_viz_df, top_docs_stats

    @staticmethod
    def __get_sql_data(table_name):
        """creates a dataframe copy of the sql database table

        Args:
            table_name: (str) name of the table which is being queried

        Returns: dataframe
        """
        conn = pymssql.connect(
            server=SQL_CONNECTION['SERVER'],
            port=SQL_CONNECTION['PORT'],
            user=SQL_CONNECTION['USER'],
            password=SQL_CONNECTION['PASSWORD'],
            database=SQL_CONNECTION['DATABASE']
        )

        cur = conn.cursor(as_dict=True)
        try:
            cur.execute(f"SELECT * FROM [dbo].[{table_name}]")
            data = cur.fetchall()
        except:
            pass
        else:
            df = pd.DataFrame(data)
        finally:
            cur.close()
            conn.close()
            if df is not None:
                return df

    @staticmethod
    def update_sql(table_name, updates):
        """ updates the sql database rows based on a list of tuples

        Args:
            table_name: str, name of the table which is being updated
            updates:    list, each elemant of the list is a tuple (col_name, id) - col_name is the name of the col to be
                        updated and id is the row id

        Returns: bool, True/False based on successfully passing commit
        """
        success = False

        try:
            conn = pymssql.connect(
                server=SQL_CONNECTION['SERVER'],
                port=SQL_CONNECTION['PORT'],
                user=SQL_CONNECTION['USER'],
                password=SQL_CONNECTION['PASSWORD'],
                database=SQL_CONNECTION['DATABASE']
            )

            cur = conn.cursor()
            try:
                for update in updates:
                    cur.execute(f"UPDATE [dbo].[{table_name}] set {update[0]} = '{update[1]}' WHERE ID ={update[2]}")
            except Exception as e:
                # print(e)
                print("There was an error connecting to the database, the current selections have not been saved.")
            else:
                conn.commit()
                print("The database has been updated with the current selections.")
                success = True
            finally:
                cur.close()
                conn.close()
        except Exception as e:
            print("There was an error connecting to the database, the current selections have not been saved. outer")
        return success
