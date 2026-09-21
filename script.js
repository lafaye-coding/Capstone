// Hold references to page elements so we don't re-query the DOM on every click
let tableBody
let loadBtn
let currentPeriod = 1
let editingCell = null
let clickTimer = null

// Wait for the HTML to finish loading before touching the DOM
document.addEventListener('DOMContentLoaded', () => {
  // Grab the table body where rows get inserted
  tableBody = document.querySelector('#populationTable tbody')
  // Grab the "Load Data" button
  loadBtn = document.getElementById('loadPopulationBtn')
  // Wire the button click to the fetch function
  loadBtn.addEventListener('click', function () { loadBtcsData() })
  // Let the user click/edit periods and data right inside the table
  addTableInteractions()
})

// Adds click/double-click behaviour to the table (event delegation so it
// keeps working after every reload)
function addTableInteractions () {
  injectStyles()
  tableBody.addEventListener('click', onCellClick)
  tableBody.addEventListener('dblclick', onCellDblClick)
}

// Injects a little bit of CSS from JS so the selected/editing cells stand out
function injectStyles () {
  const style = document.createElement('style')
  style.textContent = `
    td.selected { background: #c3e0ff !important; }
    td[contenteditable="true"] { background: #fff3b0 !important; outline: 2px solid #0c9da5; }
  `
  document.head.append(style)
}

// Clicking a Period cell loads that period; clicking any other cell edits it
function onCellClick (e) {
  const td = e.target.closest('td')
  if (!td) return
  // If this cell is already being edited, let the user place the cursor freely
  if (td === editingCell) return
  // Save whatever cell is being edited right now
  commitEdit(editingCell)

  if (td.cellIndex === 0) {
    // Period column: wait briefly so a double-click to edit still works
    clearTimeout(clickTimer)
    clickTimer = setTimeout(function () {
      loadPeriod(td.textContent.trim())
    }, 250)
  } else {
    // Any other column: click to edit the value in place
    startEditing(td)
  }
}

// Double-clicking a Period cell lets you type a new period number
function onCellDblClick (e) {
  const td = e.target.closest('td')
  if (!td || td.cellIndex !== 0) return
  // Cancel the pending single-click "load this period"
  clearTimeout(clickTimer)
  startEditing(td)
}

// Enter edit mode on the given cell
function startEditing (td) {
  commitEdit(editingCell)
  editingCell = td
  td.contentEditable = 'true'
  // Select the existing text so typing replaces it
  const range = document.createRange()
  range.selectNodeContents(td)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  td.focus()

  td.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit(td)
    }
  })
  td.addEventListener('blur', function () {
    commitEdit(td)
  })
}

// Leave edit mode and apply the change
function commitEdit (td) {
  if (!td) return
  if (td.isContentEditable) td.contentEditable = 'false'
  if (editingCell === td) editingCell = null

  // Editing the Period column means "load that period"
  if (td.cellIndex === 0) {
    const period = parseInt(td.textContent.trim(), 10)
    if (!isNaN(period) && period >= 1) loadPeriod(period)
  }
}

// Loads data for the given period number
function loadPeriod (period) {
  document.getElementById('loadInfo').textContent = 'Loading period ' + period + '...'
  loadBtcsData(period)
}

// Fetches the Census BtOS data from the API and renders it into the table
function loadBtcsData (period) {
  // Use the passed-in period, otherwise fall back to the current one
  if (period == null) period = currentPeriod
  currentPeriod = period
  // Clear the table so a second load doesn't stack rows
  tableBody.innerHTML = ''
  // Disable the button while the request is running (prevents double clicks)
  loadBtn.disabled = true
  // Hide the table again while we wait for fresh data
  document.getElementById('populationTable').classList.add('hidden')
  // Show a loading message below the button
  document.getElementById('loadInfo').textContent = 'Loading...'

  // Build the URL, including the period as a query param, then fetch it
  const url =
    'https://www.census.gov/hfp/btos/api/periods/' + period + '/data?PERIOD=' +
    encodeURIComponent(period + '/2025')

  fetch(url)
    .then(function (response) {
      // Throw a proper error so failed requests land in the catch block
      if (!response.ok) throw new Error('HTTP ' + response.status)
      return response.json()
    })
    .then(function (data) {
      // Make sure the response is an array before we try to loop over it
      const records = Array.isArray(data) ? data : []
      // Build the table rows from the records
      renderRecords(records)
    })
    .catch(function (error) {
      // Show a friendly alert if the request fails
      alert('An error occurred: ' + error.message)
    })
    .finally(function () {
      // Re-enable the button whether we succeeded or failed
      loadBtn.disabled = false
    })
}

// Builds and inserts the table rows for the given records
function renderRecords (records) {
  // Only render the first 250 records so a huge response doesn't freeze the browser
  const rows = records.slice(0, 250)
  // A fragment lets us build all rows off-screen, then insert once (faster)
  const frag = document.createDocumentFragment()

  rows.forEach(function (rec) {
    // Create one table row per record
    const tr = document.createElement('tr')

    // These are the columns we want to display, in order
    const fields = [
      'PERIOD_ID',
      'DATE_RANGE',
      'STATE',
      'NAICS2',
      'QUESTION',
      'ANSWER',
      'INDEX_ESTIMATE_PERCENTAGE',
      'INDEX_STANDARD_ERROR'
    ]

    // Create a table cell for each field and fill it with the record's value
    fields.forEach(function (field) {
      const td = document.createElement('td')
      // Show an empty cell instead of the word "null" when a value is missing
      td.textContent = rec[field] == null ? '' : rec[field]
      tr.append(td)
    })

    // Add the finished row to the fragment
    frag.append(tr)
  })

  // Replace whatever was in the table with the new rows
  tableBody.innerHTML = ''
  tableBody.append(frag)

  // Update the info line with how many rows we drew vs. total records
  const info = document.getElementById('loadInfo')
  info.textContent =
    'Showing ' + rows.length + ' of ' + records.length +
    ' records from period ' + currentPeriod + '.'
  // Show the table now that it has content
  document.getElementById('populationTable').classList.remove('hidden')
}