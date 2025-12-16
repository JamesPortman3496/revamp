# document types
DOC_TYPES = ['Legislation', 'Guidance']
# change relevancy types
REL_TYPES = ['not relevant', 'relevant', 'maybe relevant', 'all']
# recency periods
RECENCY_PERIODS = ['1 month', '3 months', '6 months', '1 year', '2 years', 'Historical']
# recency types (recency periods or recency types will be used eventually)
RECENCY_TYPES = ['New', 'Historical']

# link relevancy types
LINK_RELEVANCY_TYPES = ['Strong', 'Soft']
LINK_REL_MAP = {'not relevant': 0, 'Soft': 0.5, 'Strong': 1}
# date format for the currentRevision column
DT_FORMAT = '%Y-%m-%d'
# status of a change (reviewed/addressed)
STATUS = ['Not Started', 'Reviewed', 'Addressed', 'Not Relevant']
# start date from which the backlog statistics are shown on the landing page
START_DT_FOR_BACKLOG_STATS = "01/01/2022"
