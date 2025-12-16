"""
=====================================
Title:  SLComply.ai - Flasp Web app main script
Author: Manju Nair
Date:   29 July 2022
_           _
\_( o.O )_/
=====================================
"""
from flask import Flask, render_template, request, jsonify
import utils
import constant
from config import APP_SECRET_KEY, SQL_CONNECTION
import json
# create an instance of the Flask object
from data_manager import DataManager
from apscheduler.schedulers.background import BackgroundScheduler
import atexit


app = Flask(__name__)
app.config['SECRET_KEY'] = APP_SECRET_KEY

# initialise data manager for getting and regularly updating the datasets required for the flask webapp
dm = DataManager()


# runs a function in the background on a seperate thread every hour to update the database
scheduler = BackgroundScheduler()
scheduler.add_job(func=dm.update, trigger="interval", seconds=3600)
scheduler.start()

# Shut down the scheduler when exiting the app
atexit.register(lambda: scheduler.shutdown())


# ** Define routes **
# ------------------------------------------------
# route for home page
@app.route("/")
def landing_page():
    return render_template("landing_page.html", top_docs_stats=dm.top_docs_stats,
                           reviewed_stats=utils.get_backlog_stats(dm.final_output_df))


# route for detect changes page
@app.route("/index")
def index():
    return render_template("index.html", DOC_TYPES=constant.DOC_TYPES, REL_TYPES=constant.REL_TYPES)


# route when a document type is selected
@app.route('/doc_select')
def doc_select():
    # get selected doc type
    doc_type = request.args.get("doc_typ")
    
    # if gov is selected return gov doc names else non_gov doc names
    docs = dm.gov_docs if doc_type.lower() == 'legislation' else dm.nongov_docs
    return jsonify({'docs': docs})


# route when a document is selected
@app.route('/recency_select')
def recency_select():
    """ returns recency dropdown options when the user selects a document

    :return: (json) - options for the recency dropdown
    """
    return jsonify({'recency_periods': constant.RECENCY_PERIODS})


# route when a recency period is selected
@app.route('/sec_select')
def sec_select():
    """ returns section dropdown options when the user selects a recency value

    :return: (json) - options for the section dropdown
    """
    # get selected doc type, document name and recency
    doc_type = request.args.get("doc_typ")
    docs = request.args.get("docs")
    recency = request.args.get("recency")
    
    # get sections for the selected doc_type, document and recency
    secs = utils.get_section_options(doc_type, docs, recency, dm.final_output_df)
    return jsonify({'secs': secs})


# route when a section is selected
@app.route('/relevance_select')
def relevance_select():
    """returns relevance dropdown options when the user selects a section

    :return: (json) - options for the relevance dropdown
    """
    return jsonify({'rel_type': constant.REL_TYPES})


# route when a relevancy is selected
@app.route('/doc_change')
def doc_change():
    """ returns values to be displayed on table, pdf viewer and change viewer, when the user selects relevancy

    :return: (json) - detect changes page details (key metrics, change table, pdf viewer)
    """
    # get selected doc type, document name, recency, section and relevance
    doc_type = request.args.get("doc_typ")
    docs = request.args.get("docs") 
    recency = request.args.get("recency")
    sec = request.args.get("sec")
    rel_type = request.args.get("rel_type")
    
    # get the page details for the selected doc_type, document, recency, section and relevance
    page_details = utils.get_doc_changes(doc_type, docs, recency, sec, rel_type, dm.final_output_df)
    
    return jsonify(page_details)


# route when the submit button is clicked
@app.route('/save_changes', methods=['POST'])
def save_changes():
    """ Triggered by the Submit button, gets the updated data from the 'Status' dropdown (value) and unique row ids (id)
    and updates the db and the final_output_df

    :return: (json) - success (boolean variable) 
                      text message (which is displayed on the UI when the db update succeeds or fails)
    """
    # get results (modified status value and 'ID')
    results_tmp = request.form['results']
    # parse the string back into a dictionary
    results = json.loads(results_tmp)

    # for each row in results, create a list of tuples (row id, col name, value to be filled in the col)
    # for rows to be updated in the sql table and the dataframe
    db_updates, df_updates = utils.update_status_on_submit(results, dm.final_output_df)

    # update[0] - mask on ID col, update[1] - col to be updated, update[2] - value to be filled in the col
    for update in df_updates:
        dm.final_output_df.loc[update[0], update[1]] = update[2]
    # update the sql db
    response = dm.update_sql(SQL_CONNECTION['TABLE_NAME'], db_updates)
    # format a message to be returned to the UI
    success, txt_msg = utils.format_response_msg_on_submit(response)
    
    return jsonify({'success': success, 'txt_msg': txt_msg})
                    
                    
# Define routes for document map and golden thread tabs
# ---------------------------------------------------------------
# route for the document mapper tab
@app.route("/document_map")
def document_map():
    """renders the document map page"""
    return render_template("document_map.html", DOC_TYPES=constant.DOC_TYPES,
                           link_rel_types=constant.LINK_RELEVANCY_TYPES, recency_types=constant.RECENCY_TYPES)


# route for the 'Generate Document Map' button
@app.route('/plot_treemap')
def plot_treemap():
    """plots a treemap and converts it to json format

    :return: (json) - treemap plot converted to json format
    """
    # get document type selected by the user
    doc_type = request.args.get("document_type")

    # get the copy of gov or non-gov dataframe depending on the doc_type
    plot_doc_df = utils.get_gov_or_nongov_df_copy(doc_type, dm.gov_viz_df, dm.nongov_viz_df)
    # get doc name
    docs = request.args.get("docs")
    # filter the dataframe on the document name
    plot_doc_df = plot_doc_df.loc[plot_doc_df.documentName == docs]
    # get link relevancy selected by the user
    link_rel_type = request.args.get("maybe_link")
    # filter the dataframe accordingly
    plot_doc_df = utils.get_relevant_link_rows_for_viz(link_rel_type, plot_doc_df)
    # get recency selected by the user
    recency = request.args.get("recency_date")
    # filter dataframe based on the recency period selected
    plot_doc_df = utils.get_recent_rows_for_viz(recency, plot_doc_df)
    # plot treemap with the filtered df
    graph_json = utils.plot_treemap(plot_doc_df)

    return graph_json


# route for the golden thread tab    
@app.route("/golden_thread")
def golden_thread():
    """renders the golden thread tab page"""
    return render_template("golden_thread.html", DOC_TYPES=constant.DOC_TYPES,
                           link_rel_types=constant.LINK_RELEVANCY_TYPES, recency_types=constant.RECENCY_TYPES)


# route after a document type is selected from the dropdown for the golden thread page
@app.route('/link_rel_select')
def link_rel_select():
    """ returns link relevancy dropdown options when the user selects a document type

    :return: (json) - options for the link relevancy dropdown
    """
    return jsonify({'link_rel_types': constant.LINK_RELEVANCY_TYPES})


# route after a link relevancy is selected from the dropdown for both golden thread and document map pages
@app.route('/rec_select')
def rec_select():
    """ returns recency dropdown options when the user selects a link relevancy

    :return: (json) - options for the recency dropdown
    """
    # return jsonify({'recency_types': constant.RECENCY_TYPES})
    return jsonify({'recency_types': constant.RECENCY_PERIODS})


# route for the 'Generate Golden Thread' button
@app.route('/plot_sankey')
def plot_sankey():
    """ returns a sankey plot converted to json format

    :return: (json) - sankey plot converted to json format
    """
    # get document type selected by the user
    doc_type = request.args.get("document_type")
    # get the gov or non-gov dataframe depending on the doc_type
    plot_doc_df = utils.get_gov_or_nongov_df_copy(doc_type, dm.gov_viz_df, dm.nongov_viz_df)
    # get link relevancy selected by the user
    link_rel_type = request.args.get("maybe_link")
    # filter the dataframe accordingly
    plot_doc_df = utils.get_relevant_link_rows_for_viz(link_rel_type, plot_doc_df)
    # get recency selected by the user
    recency = request.args.get("recency_date")
    # filter dataframe based on the recency period selected
    plot_doc_df = utils.get_recent_rows_for_viz(recency, plot_doc_df)
    # format the dataframe as needed for a sankey plot with source id, target id, etc
    sankey_df = utils.format_data_for_sankey(plot_doc_df)
    # get the list of labels for a sankey from the sankey dataframe
    labels = utils.create_labels(sankey_df)
    # generate colours for links and nodes
    sankey_df, sankey_cmaps = utils.gen_colour(sankey_df)
    # plot the sankey diagram
    graph_json = utils.sankey_plot(sankey_df, labels, sankey_cmaps)
    
    return graph_json


if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True)
