/*
* Function that displays the options for the link relevancy dropdown after document type is selected on the Golden Thread page
*/
function link_rel_select() {
    $('#gen_treemap').prop('disabled', true);
    $.ajax({
        url: "link_rel_select", type: "get", success: function (response) {
            var link_rel = response.link_rel_types

            // empty dropdowns on the right when the parent dropdown is changed
            $("#recency_date").empty();
            $("#recency_date").append("<option disabled selected value>Select Recency</option>");

            $("#maybe_link").empty();
            $("#maybe_link").append("<option disabled selected value>Select Link Strength</option>");

            // list the options in the link relevancy dropdown
            for (var grp of Object.entries(link_rel)) {
                $("#maybe_link").append("<option value='" + grp[1] + "'>" + grp[1] + "</option>");
            }

           

        }
    })
}

/*
* Function that displays the options for the recency dropdown after link relevancy is selected on both Golden Thread and Document Map pages
*/
function rec_select() {
    $('#gen_treemap').prop('disabled', true);
    $.ajax({
        url: "rec_select", type: "get", success: function (response) {
            var recency_types = response.recency_types

            $("#recency_date").empty();
            $("#recency_date").append("<option disabled selected value>Select Recency</option>");

            for (var grp of Object.entries(recency_types)) {
                $("#recency_date").append("<option value='" + grp[1] + "'>" + grp[1] + "</option>");
            }

        }
    })
}


/*
* Function that enables the 'Generate Document Map' button once the recency is selected
*/
function enable_button() {
    $('#gen_treemap').prop('disabled', false);
}

