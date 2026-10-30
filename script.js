
let tableBody
let loadBtn
let currentPeriod = 1
let editingCell = null
let clickTimer = null

document.addEventListener('DOMContentLoaded', () => {
 
  tableBody = document.querySelector('#populationTable tbody')

  loadBtn = document.getElementById('loadPopulationBtn')

  loadBtn.addEventListener('click', function () { loadBtcsData() })

  addTableInteractions()
})


function addTableInteractions () {
  injectStyles()
  tableBody.addEventListener('click', onCellClick)
  tableBody.addEventListener('dblclick', onCellDblClick)
}

function injectStyles () {
  const style = document.createElement('style')
  style.textContent = `
    td.selected { background: #c3e0ff !important; }
    td[contenteditable="true"] { background: #fff3b0 !important; outline: 2px solid #0c9da5; }
  `
  document.head.append(style)
}



function onCellClick (e) {
  const td = e.target.closest('td')
  if (!td) return

  if (td === editingCell) return
  
  commitwhatever cell is being edited right nowEdit(editingCell)

  if (td.cellIndex === 0) {
    
    clearTimeout(clickTimer)
    clickTimer = setTimeout(function () {
      loadPeriod(td.textContent.trim())
    }, 250)
  } else {
    
    startEditing(td)
  }
}

function onCellDblClick (e) {
  const td = e.target.closest('td')
  if (!td || td.cellIndex !== 0) return
  clearTimeout(clickTimer)
  startEditing(td)
}


function startEditing (td) {
  commitEdit(editingCell)
  editingCell = td
  td.contentEditable = 'true'
  
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


function commitEdit (td) {
  if (!td) return
  if (td.isContentEditable) td.contentEditable = 'false'
  if (editingCell === td) editingCell = null

  
  if (td.cellIndex === 0) {
    const period = parseInt(td.textContent.trim(), 10)
    if (!isNaN(period) && period >= 1) loadPeriod(period)
  }
}


function loadPeriod (period) {
  document.getElementById('loadInfo').textContent = 'Loading period ' + period + '...'
  loadBtcsData(period)
}


function loadBtcsData (period) {
  
  if (period == null) period = currentPeriod
  currentPeriod = period
  
  tableBody.innerHTML = ''
  
  loadBtn.disabled = true
 
  document.getElementById('populationTable').classList.add('hidden')

  document.getElementById('loadInfo').textContent = 'Loading...'

  
  const url =
    'https://www.census.gov/hfp/btos/api/periods/' + period + '/data?PERIOD=' +
    encodeURIComponent(period + '/2025')

  fetch(url)
    .then(function (response) {
      
      if (!response.ok) throw new Error('HTTP ' + response.status)
      return response.json()
    })
    .then(function (data) {

      const records = Array.isArray(data) ? data : []
      
      renderRecords(records)
    })
    .catch(function (error) {
      
      alert('An error occurred: ' + error.message)
    })
    .finally(function () {
      
      loadBtn.disabled = false
    })
}


function renderRecords (records) {
  
  const rows = records.slice(0, 250)
  const frag = document.createDocumentFragment()

  rows.forEach(function (rec) {
   
    const tr = document.createElement('tr')


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

  
    fields.forEach(function (field) {
      const td = document.createElement('td')
      
      td.textContent = rec[field] == null ? '' : rec[field]
      tr.append(td)
    })


    frag.append(tr)
  })


  tableBody.innerHTML = ''
  tableBody.append(frag)

  const info = document.getElementById('loadInfo')
  info.textContent =
    'Showing ' + rows.length + ' of ' + records.length +
    ' records from period ' + currentPeriod + '.'
  
  document.getElementById('populationTable').classList.remove('hidden')
}
