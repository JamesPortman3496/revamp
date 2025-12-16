/*
* Function that gets the document type selected by the user and accordingly displays the options for the document dropdown on both Detect Changes and Document Map pages
*/
function doc_select() {
    // get the document type value selected by user
    var doc_typ_temp = document.getElementById("doc_typ");
    var doc_typ = doc_typ_temp.options[doc_typ_temp.selectedIndex].value;

    var model_parameters = {
        'doc_typ': doc_typ,
    }

    // send the selected document type to the server and get document names to be displayed in the document dropdown from the server
    $.ajax({
        url: "doc_select", type: "get", data: model_parameters, success: function (response) {
            var docs = response.docs

            // empty all dropdowns on right when a parent dropdown is changed
            $("#docs").empty();
            $("#docs").append("<option disabled selected value>Select Document</option>");

            $("#sec").empty();
            $("#sec").append("<option disabled selected value>Select Section</option>");

            $("#recency").empty();
            $("#recency").append("<option disabled selected value>Select Recency</option>")

            $("#rel_type").empty();
            $("#rel_type").append("<option disabled selected value>Select Relevance</option>");

            for (var grp of Object.entries(docs)) {
                $("#docs").append("<option value='" + grp[1] + "'>" + grp[1] + "</option>");
            }

        }
    })
}


/*
* Function that displays the options for the receny dropdown once the user has selected a document
*/
function recency_select() {
    $.ajax({
        url: "recency_select", type: "get", success: function (response) {
            var recency = response.recency_periods

            //when a document is selected, clear all the other dropdowns such as section, relevance and the table
            $("#sec").empty();
            $("#sec").append("<option disabled selected value>Select Section</option>");

            $("#recency").empty();
            $("#recency").append("<option disabled selected value>Select Recency</option>");

            $("#rel_type").empty();
            $("#rel_type").append("<option disabled selected value>Select Relevance</option>");

            for (var grp of Object.entries(recency)) {
                $("#recency").append("<option value='" + grp[1] + "'>" + grp[1] + "</option>");
            }

            // document.getElementById("information").style.display = `${info}`;

        }
    })
}


/*
* Function that gets the document type, document and recency selected by the user and accordingly displays the options for the section dropdown
*/
function sec_select() {

    var doc_typ_temp = document.getElementById("doc_typ");
    var doc_typ = doc_typ_temp.options[doc_typ_temp.selectedIndex].value;

    var docs_temp = document.getElementById("docs");
    var docs = docs_temp.options[docs_temp.selectedIndex].value;

    var recency_temp = document.getElementById("recency");
    var recency = recency_temp.options[recency_temp.selectedIndex].value;

    var model_parameters = {
        'doc_typ': doc_typ,
        'docs': docs,
        'recency': recency,
        
    }

    $.ajax({
        url: "sec_select", type: "get", data: model_parameters, success: function (response) {

            var secs = response.secs

            $("#sec").empty();
            $("#sec").append("<option disabled selected value>Select Section</option>");

            $("#rel_type").empty();
            $("#rel_type").append("<option disabled selected value>Select Relevance</option>");

            // add the dropdown value of 'all' only if there are sections available for this recency period else show an appropriate message
            if (Object.entries(secs).length != 0) {
                $("#sec").append("<option value='All'>All</option>");
            }
            else{
                $("#sec").append("<option value='-'>No sections available for this period</option>");
            }
            

            for (var [key, value] of Object.entries(secs)) {
                $("#sec").append("<option value='" + value[0] + "'>" + value[0] + "</option>");
            }

        }
    })
}


/*
* Function that displays the options for the relevance dropdown once the user has selected a section
*/
function relevance_select() {
    $.ajax({
        url: "relevance_select", type: "get", success: function (response) {
            var rel_type = response.rel_type

            $("#rel_type").empty();
            $("#rel_type").append("<option disabled selected value>Select Relevance</option>");

            for (var grp of Object.entries(rel_type)) {
                $("#rel_type").append("<option value='" + grp[1] + "'>" + grp[1] + "</option>");
            }

            // document.getElementById("information").style.display = `${info}`;

        }
    })
}



/*
* Function that gets the updated values of the status dropdown and sends it to the server
*/
function save_changes(){
  // get the value from the display table on the UI
   const table = document.getElementById('table');
   var results = [];

   // loop over each row in the table
   for (var i = 1, row; row = table.rows[i]; i++) {
       // get the value in the last col (status)
        var lastCol = row.cells[row.cells.length-1];

        // get the dropdown or slect tag in the last col (status)
        var select = lastCol.getElementsByTagName('select');

        // get the id of the dropdown (this is also the unique change number needed to identify the row to be modified)
        const id = select[0].id;

        // get the value at the selected option
        const selectedOption = select[0].options[select[0].selectedIndex].value;

        // append the dictionary of id and value to the results array
        results.push({'id': id, 'value': selectedOption});
      
    }
    
    // convert results into json format
    var status_dropdown_data = {
                            'results': JSON.stringify(results)
                        };
    
    
    $.ajax({
        url: "save_changes", type: "post", data: status_dropdown_data, success: function (response) {

            /* if the dB is updated with the status change, display a success alert with the text message else a fail alert and fade it out after 2 secs */
            var success = response.success;
            var txt_msg = response.txt_msg;
            $('#save_msg').show()

            if (success) {
                $('#save_msg').addClass("alert alert-success")
            }
            else {
                $('#save_msg').addClass("alert alert-danger")
            }


            $('#save_msg').html(`<p id="saved_msg" class="font-weight-bold text-center">${txt_msg}</p>` )

            setTimeout(() => {
                $('#save_msg').fadeOut('fast');
              }, 30000);
              
            
        }
    })
}



/*
* Function that displays the details in the table once the user has selected values from all the dropdowns
*/
function doc_change() {

    var doc_typ_temp = document.getElementById("doc_typ");
    var doc_typ = doc_typ_temp.options[doc_typ_temp.selectedIndex].value;

    var docs_temp = document.getElementById("docs");
    var docs = docs_temp.options[docs_temp.selectedIndex].value;

    var recency_temp = document.getElementById("recency");
    var recency = recency_temp.options[recency_temp.selectedIndex].value;

    var sec_temp = document.getElementById("sec");
    var sec = sec_temp.options[sec_temp.selectedIndex].innerText;

    var rel_type_temp = document.getElementById("rel_type");
    var rel_type = rel_type_temp.options[rel_type_temp.selectedIndex].value;
    

    var model_parameters = {
        'doc_typ': doc_typ,
        'docs': docs,
        'recency': recency,
        'sec': sec,
        'rel_type': rel_type
    }

    $.ajax({
        url: "doc_change", type: "get", data: model_parameters, success: function (response) {

            var doc_type = response.doc_type
            var num_tot_changes = response.num_tot_changes
            var num_sec_changes = response.num_sec_changes
            var num_rel_sec_changes = response.num_rel_sec_changes
            var info = response.info
            var current_rev = response.current_rev
            var previous_rev = response.previous_rev
            var current_rev_pdf = response.current_rev_pdf
            var previous_rev_pdf = response.previous_rev_pdf
            var table_heading = response.table_heading

            var detail_df = response.detail_df
            var status = (response.status)
            
            var info = response.info

            // Key Metrics
            $('#current_rev').text(current_rev)
            $('#previous_rev').text(previous_rev)
            $('#num_sec_changes').text(num_sec_changes)
            $('#num_tot_changes').text(num_tot_changes)
            $('#num_rel_sec_changes').text(num_rel_sec_changes)
            
            function display_status_dropdown(status_value){
                // function to display status column as a dropdown in the changes table
                // It uses the status array values to display the dropdown options
                dropdown = ""
                for (let i=0; i<status.length; i++){
                   // console.log(status[i])
                    dropdown += "<option value=" + `\'${status[i]}\'` + " " + set_default_status(status_value, status[i]) + ">" + status[i] + "</option>"
                } 
                return dropdown
            }

            // Change Detail Table column header
            // this is dynamic as Revision # column is needed only for non-gov docs (!= Legislature)
            $("#table_header").empty();
            if (doc_type != 'Legislation'){

                header_html_str = `<th scope="col" class="align-top">Rev #
                </th>`;

            }
            else {
                header_html_str = ''
            }

            header_html_str += `<th scope="col" class="align-top col-sm-1">Revision
            </th>
            <th scope="col" class="col-sm-1 align-top">Section Title
            </th>
            <th scope="col">Page Number
            </th>
            <th scope="col" class="col-sm-5 align-top">Changes Extracted
            </th>
            <th scope="col" class="col-sm-1 align-top">Relevance
            </th>
            <th scope="col" class="col-sm-1 align-top">Strong Links
            </th>
            <th scope="col" class="col-sm-1 align-top">Soft Links
            </th>
            <th scope="col" class="col-sm-2 align-top">Status
            </th>
            `
            $("#table_header").append(header_html_str);

            /* Change Detail Table rows
            // dynamically appending to the table depending on number of rows received from the server
            // value is a list of values for each col in the table (refer line 480 in utils.py)
            
            // value[0] - currentRevision, value[1] - sectionTitle, value[2] - sectionNumber, value[3] - pageNumber , value[4] - changeText, value[5] -rel_model_pred, value[6] -sl_document , value[7] - ID, value[8]-status
            // for non gov docs value[0] will be revisionNumber and everything else following it will be same
            */
            $("#detail_df").empty();
            // for (var [key, value] of Object.entries(detail_df)) {
            for (j=0; j < detail_df.length; j++) {
                // get the array of column values which is at detail_df[j]
                value = detail_df[j]
                html_str = '<tr>';
                
                for (i=0; i < value.length - 2; i++){
                    html_str += '<td scope="row">' + value[i] + '</td>';
                }
            
                html_str += `<td scope="row">
                                <select class="btn btn-secondary    dropdown-toggle" id="${value[value.length - 2]}" style="width: 100%;">
                                        <option disabled selected value>Select status</option>
                                        ${display_status_dropdown(value[value.length - 1])}
                                    
                                </select>
                                </td> 
                            </tr>`; 
                    $('#detail_df').append(html_str) 
            }


            function set_default_status(status_db_value, status_dropdown_option){
                // function which compares the value of the status of a change in the db to the dropdown option
                // and sets the 'Selected' attribute of the dropdown so that it is selected by default
                
                if (status_db_value.toLowerCase() == status_dropdown_option.toLowerCase()){
                    return 'Selected'
                }
                else{
                    return ''
                }
            }

            // Document PDF Viewer
            $('#current_rev_pdf').attr('src', current_rev_pdf);
            $('#previous_rev_pdf').attr('src', previous_rev_pdf);

            document.getElementById("information").style.display = `${info}`;

        }
    })
}

