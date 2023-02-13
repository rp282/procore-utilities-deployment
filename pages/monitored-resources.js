import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Layout from '../components/layout'
import styles from '../styles/MonitoredResources.module.css'
import { sortAscending } from '../utils/sorting'
import { wbsMap } from '../data/wbsMap'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { convertToPeriodEndDate } from '../utils/miscFunctions'
import { formatCurrency } from '../utils/formatting'
export const LS_KEY_SELECTED_PROJECTS = 'procore-utilities.selected-projects'

export default function Home() {
  const {data, status} = useSession()
  const [projectList, setProjectList] = useState([])
  const [filteredProjects, setFilteredProjects] = useState(projectList)
  const [selectedProjects, setSelectedProjects] = useState([]) 
  const [searchQuery, setSearchQuery] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [contentLoading, setContentLoading] = useState(true)
  const [monitoredResources, setMonitoredResources] = useState([])
  const [budgetLineItems, setBudgetLineItems] = useState([])
  const [selectedMonitoredResources, setSelectedMonitoredResources] = useState([])
  const [chartDataObj, setChartDataObj] = useState([])
  const [chartDataMap, setChartDataMap] = useState({})
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    console.log({ budgetLineItems, monitoredResources })
    // console.log('groups',groupLines(monitoredResources))
    setChartDataObj(calculateChartData(monitoredResources))
  }, [monitoredResources])  

  useEffect(() => {
    let map = {}
    chartDataObj.forEach(d => map[d.datetime] = d)
    setChartDataMap(map)
    setChartData(chartDataObj.map(({datetime, cost, items}) => {
      let itemStr = ``
      items = items.sort((a, b) => {
        if (a.calculated_unit_cost > b.calculated_unit_cost) return -1
        if (a.calculated_unit_cost < b.calculated_unit_cost) return 1
        return 0
      })
      items.forEach(({description, calculated_unit_cost}) => {
        itemStr += `<tr><td>${description}</td><td>${formatCurrency.format(calculated_unit_cost)}</td></tr>`
      })
      return {
        x: datetime,
        y: cost,
        custom:{
          items:itemStr,
          total: formatCurrency.format(cost)
        }
      }
    }))
  }, [chartDataObj])

  useEffect(() => {
    console.log('chartData', chartData)
  }, [chartData])

  useEffect(() => {
    let previouslySelectedProjects = JSON.parse(localStorage.getItem(LS_KEY_SELECTED_PROJECTS))
    if (previouslySelectedProjects != undefined && previouslySelectedProjects.length > 0) setSelectedProjects(previouslySelectedProjects)
  }, [])
  
  useEffect(() => {
    const abortController = new AbortController();
    localStorage.setItem(LS_KEY_SELECTED_PROJECTS, JSON.stringify(selectedProjects))
    setContentLoading(true)
    if (selectedProjects.length == 0) {
      setMonitoredResources([])
      setBudgetLineItems([])
      return setContentLoading(false)
    }
    if (status == 'authenticated') {
      fetch(`/api/procore/export/monitored-resources`, {
        signal:abortController.signal,
        method:'POST',
        headers: {'Authorization': `Bearer ${data.user.procore.access_token}`},
        body: JSON.stringify(selectedProjects.map(p => p.id))
      })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        return Promise.reject();
      })
      .then((json) => {
        let { budgetLineItems, monitoredResources } = formatPageData(json)
        setBudgetLineItems(budgetLineItems)
        setMonitoredResources(monitoredResources)
      })
      .catch(() => {
        if (abortController.signal.aborted) {
          console.log('The user aborted the request for:', selectedProjects);
        } else {
          console.error('The request failed');
        }
      })
      .finally(() => {
        setContentLoading(false);
      });
    }
    return () => {
      abortController.abort();
    };
  }, [selectedProjects, status])

  useEffect(() => {
    console.log('session:', {data, status})
  }, [data])

  useEffect(() => {
    if (status == 'authenticated' && projectList.length == 0) {
      initialLoad()
    }
  }, [status])

  useEffect(() => {
    handleSearchProjects(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    setFilteredProjects(projectList)
  }, [projectList])

  async function initialLoad() {
    console.log('initialLoad s')
    await updateProjectList()
    // if (selectedProjects.length > 0 && monitoredResources.length == 0) loadContent()
    console.log('initialLoad e')
  }

  async function loadContent() {
    console.log('loadContent s')
    setContentLoading(true)
    await updateMonitoredResources()
    setContentLoading(false)
    console.log('loadContent e')
  }


  async function updateMonitoredResources() {
    if (selectedProjects.length < 1) {
      setMonitoredResources([]) 
      setBudgetLineItems([])
    } else {
      let { budgetLineItems, monitoredResources } = await getMonitoredResourcesWithBudgetData()
      if (monitoredResources != undefined) {
        setMonitoredResources(monitoredResources)
        setBudgetLineItems(budgetLineItems)
      }
    }
  }
  async function updateProjectList() {
    let res = await fetch('/api/procore/portfolio', {
      method:'GET',
      headers: {'Authorization': `Bearer ${data.user.procore.access_token}`}
    })
    let json = await res.json()
    json = json.filter(p => p.project_number?.length == 7)
    return setProjectList(json.sort((a, b) => {
      if (a.project_number < b.project_number) return -1
      if (a.project_number > b.project_number) return 1
      return 0
    }))
  }

  function formatPageData({ budgetLineItems, monitoredResources }) {
      let projectMap = {}
      projectList.forEach(p => {
        projectMap[p.id] = p.project_number
      })
      let budgetMap = {}
      budgetLineItems.forEach(line => {
        let codes = line.wbs_code.flat_code.split('.')
        let code_descriptions = line.wbs_code.description.split('.')
        let project = projectMap[line.project_id]
        line.project = project
        line.extra = 'None'
        line.cost_code = 'None'
        line.category = 'None'
        line.coding_descriptions = {
          project,
          extra: 'None',
          cost_code: 'None',
          category: 'None'
        }
        line.coding_full = {
          project,
          extra: 'None',
          cost_code: 'None',
          category: 'None'
        }
        switch (codes.length) {
          case 2: 
            line.cost_code = codes[0]
            line.category = codes[1]
            line.coding_descriptions.cost_code = code_descriptions[0]
            line.coding_descriptions.category = code_descriptions[1]
            line.coding_full.cost_code = `${codes[0]}.${code_descriptions[0]}`
            line.coding_full.category = `${codes[1]}.${code_descriptions[1]}`
            break;
          case 3:
            line.extra = codes[0]
            line.cost_code = codes[1]
            line.category = codes[2]
            line.coding_descriptions.extra = code_descriptions[0]
            line.coding_descriptions.cost_code = code_descriptions[1]
            line.coding_descriptions.category = code_descriptions[2]
            line.coding_full.extra = `${codes[0]}.${code_descriptions[0]}`
            line.coding_full.cost_code = `${codes[1]}.${code_descriptions[1]}`
            line.coding_full.category = `${codes[2]}.${code_descriptions[2]}`
            break;
          default:
            console.log('unknown length', codes.length)
            console.log('for line', line)
        }
        budgetMap[line.id] = line
      })
      monitoredResources = monitoredResources.map(forecast => {
        let { budget_line_item_id, start_date, end_date, utilization, unit_cost } = forecast
        let { extra, cost_code, category, coding_descriptions, coding_full } = budgetMap[budget_line_item_id]
        return {
          ...forecast,
          extra, 
          cost_code, 
          category, 
          coding_descriptions,
          coding_full,
          calculated_unit_cost: parseFloat((parseFloat(utilization)*parseFloat(unit_cost)).toFixed(2)),
          active: new Date(start_date).getTime() <= Date.now() && new Date(end_date).getTime() >= Date.now(),
          selected:false
        }
      })
      return { budgetLineItems, monitoredResources }
  }

  async function handleExportMonitoredResources() {
    console.time('Export')
    setDownloading(true)
    // Get & Format Data
    
    // Generate Weekly Line Items
    let weeklyMonitoredResources = []
    console.log('pregen:', monitoredResources)
    monitoredResources.forEach(forecast => {
        let checkCost = 0
        let unitsRemaining = parseInt(forecast['total_units'])
        let currentDate = new Date(forecast['end_date'])
        let cost = parseFloat(forecast['unit_cost'])*parseFloat(forecast['utilization'])
        while (unitsRemaining > 0) {
            weeklyMonitoredResources.push({...forecast, date:currentDate.toJSON().slice(0,10), cost})
            checkCost += cost
            switch(forecast['unit_of_measure']) {
                case 'weeks':
                    currentDate.setDate(currentDate.getDate() - 7)
                    break;
                case 'months':
                    currentDate.setMonth(currentDate.getMonth() - 1)
                    break;
                default:
                    console.error(`2 Unknown Unit of Measure ${forecast['unit_of_measure']} for forecast`)
                    console.log(forecast)
            }

            unitsRemaining--
        }
        
        if (checkCost.toFixed(2) != parseFloat(forecast['planned_total_cost']).toFixed(2)) {
            console.log(`Total Cost Discrepancy: ${(parseFloat(forecast['planned_total_cost'])-checkCost).toFixed(2)}
            Procore: ${parseFloat(forecast['planned_total_cost']).toFixed(2)}
            Script: ${checkCost.toFixed(2)}
            Forecast:`)
            console.log(forecast)
        }
    })

    // Format to CSV
    let output = `Sub Job,Division,Cost Code,Cost Type,Description,Start Date,End Date,Units Remaining,Unit of Measure,Unit Cost,Utilization,Calculated Unit Cost,Forecast to Complete,Planned,Project Number,Total Units,Date,Cost\n`
    weeklyMonitoredResources.forEach(forecast => {
      let {
        coding_full,
        cost,
        date,
        description,
        end_date,
        start_date,
        forecast_to_complete,
        unit_cost,
        units_remaining,
        unit_of_measure,
        utilization,
        planned_total_cost,
        total_units
      } = forecast
      let { 
        project, 
        extra, 
        cost_code, 
        category 
      } = coding_full
      output += `${extra},${cost_code.substring(0,2)},${cost_code},${category},${description},${start_date},${end_date},${units_remaining},${unit_of_measure},${unit_cost},${utilization},${cost},${forecast_to_complete},${planned_total_cost},${project},${total_units},${date},${cost}\n`
    })
    
    download(`${(new Date().toJSON().slice(0,10))} Procore Monitored Resources Data (weekified)`, output)
    setDownloading(false)
    console.timeEnd('Export')
  }

  function handleChangeMonitoredResource(forecast) {
    let newMonitoredResources = [...monitoredResources]
    let index = newMonitoredResources.indexOf(newMonitoredResources.find(f => f.id == forecast.id))
    newMonitoredResources[index] = forecast
    setMonitoredResources(newMonitoredResources)
  }

  async function handlePatchMonitoredResource(forecast) {
    let { id, project_id, description, start_date, end_date, unit_of_measure, unit_cost, utilization } = forecast
    let body = JSON.stringify({
      "monitoring_resource": { 
        description, 
        start_date, 
        end_date, 
        unit_of_measure, 
        unit_cost, 
        utilization
      }
    })
    let result = await fetch(`/api/procore/monitored-resources?id=${id}&project_id=${project_id}`, {
      method: 'PATCH',
      headers: {'Authorization': `Bearer ${data.user.procore.access_token}`},
      body
    })
    let json = await result.json()
    console.log(json)
  }

  function handleProjectDeselect(id) {
    setSelectedProjects(prev => prev.filter(p => p.id != id))
    handleSearchProjects(searchQuery)
  }

  function handleProjectSelect(id) {
    if (selectedProjects.find(p => id == p.id) != undefined) return
    setSelectedProjects(prev => [...prev,projectList.find(p => p.id === id)])
    setFilteredProjects(prev => prev.filter(p => p.id != id))
  }

  function handleSearchProjects(query) {
    if (query.length == 0) return setFilteredProjects(projectList.filter(({id}) => selectedProjects.find(p => p.id == id) == undefined))
    setFilteredProjects(projectList.filter(({id, project_number, name}) => (project_number + name).toLowerCase().includes(query.toLowerCase()) && selectedProjects.find(p => p.id == id) == undefined))
  }

  function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  let groups = ['active','category']

  function groupLines(lines, i = 0) {
    if (i >= groups.length) return formatLineItems(lines)
    let uniqueValues = getUniqueValuesInField(lines, groups[i])
    return uniqueValues.map(value => {
      return (
        <div
          key={value} 
          className={styles.group}>
          <div className={styles.groupTitle}>{wbsMap[groups[i]] != undefined ? wbsMap[groups[i]][value] : `${groups[i]}:${value}`}</div>
          {groupLines(lines.filter(l => l[groups[i]] == value), i+1)}
        </div>
      )
    })    
  }

  function getUniqueValuesInField(arrayOfObjects, field) {
      let uniqueMap = {}
      arrayOfObjects.forEach(obj => {
          let value = obj[field]
          if (uniqueMap[value] == undefined) uniqueMap[value] = value
      })
      let uniqueValues = []
      for (let property in uniqueMap) {
          uniqueValues.push(uniqueMap[property])
      }
      return uniqueValues
  }

  function formatLineItems(lines) {
    return lines.map(forecast => {
      return (
      <div 
        onClick={() => handleToggleSelectMonitoredResource(forecast.id)}
        className={`${styles.monitoredResource} ${forecast.selected ? styles.monitoredResourceSelected : ''}`}
        key={forecast.id}>
        <div className={styles.coding}>
          <div>
          {forecast.extra}.{forecast.cost_code}.{forecast.category}
          </div>
          <div className={styles.codingDescription}>
          {forecast.coding_descriptions.extra}.{forecast.coding_descriptions.cost_code}.{forecast.coding_descriptions.category}
          </div>
        </div>
        <div>
          <input 
            className={`${styles.editable}`}
            onChange={e => handleChangeMonitoredResource({...forecast, description: e.target.value})}
            onBlur={e => handlePatchMonitoredResource({...forecast, description: e.target.value})}
            value={forecast.description}></input>
        </div>
        <div>
          <input 
            className={`${styles.editable} tac`}
            onChange={e => handleChangeMonitoredResource({...forecast, start_date: e.target.value})}
            onBlur={e => handlePatchMonitoredResource({...forecast, start_date: e.target.value})}
            value={forecast.start_date}></input>
        </div>
        <div>
          <input 
            className={`${styles.editable} tac`}
            onChange={e => handleChangeMonitoredResource({...forecast, end_date: e.target.value})}
            onBlur={e => handlePatchMonitoredResource({...forecast, end_date: e.target.value})}
            value={forecast.end_date}></input>
        </div>
        <div>
          <input 
            className={`${styles.editable} tac`}
            onChange={e => handleChangeMonitoredResource({...forecast, unit_cost: e.target.value})}
            onBlur={e => handlePatchMonitoredResource({...forecast, unit_cost: e.target.value})}
            value={forecast.unit_cost}></input>
        </div>
        <div>
          <input 
            className={`${styles.editable} tac`}
            onChange={e => handleChangeMonitoredResource({...forecast, utilization: e.target.value})}
            onBlur={e => handlePatchMonitoredResource({...forecast, utilization: e.target.value})}
            value={forecast.utilization}></input>
        </div>
      </div>)
    })
  }

  function downloadBlob(filename, blob) {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 0)
  }

  function handleToggleSelectMonitoredResource(id) {
    let newMonitoredResources = [...monitoredResources]
    let newMonitoredResource = newMonitoredResources.find(mr => mr.id == id)
    let index = newMonitoredResources.indexOf(newMonitoredResource)
    newMonitoredResource.selected = !newMonitoredResource.selected
    if (!newMonitoredResource.selected) {
      setSelectedMonitoredResources(prev => prev.filter(mr => mr.id != id))
    } else {
      setSelectedMonitoredResources(prev => [...prev, newMonitoredResource])
    }
    newMonitoredResources[index] = newMonitoredResource
    setMonitoredResources(newMonitoredResources)
  }

  function calculateChartData(monitoredResources) {
    let data = []
    monitoredResources.forEach(forecast => {
      let {
        end_date, 
        unit_cost, 
        utilization, 
        unit_of_measure, 
        total_units
      } = forecast
      let unitsRemaining = parseInt(total_units)
      let currentDate = new Date(end_date)
      let cost = parseFloat(unit_cost)*parseFloat(utilization)
      while (unitsRemaining > 0) {
          let periodEndDate = convertToPeriodEndDate(currentDate)
          let existing = data.find(d => d.datetime == periodEndDate.getTime())
          if (existing != undefined) {
            existing.cost += cost
            existing.items.push(forecast)
          }
          else {
            data.push({
              datetime:periodEndDate.getTime(),
              cost,
              items:[forecast]
            })
          }
          switch(unit_of_measure) {
              case 'weeks':
                  currentDate.setDate(currentDate.getDate() - 7)
                  break;
              case 'months':
                  currentDate.setMonth(currentDate.getMonth() - 1)
                  break;
              default:
                  console.error(`2 Unknown Unit of Measure ${unit_of_measure} for forecast`)
          }
          unitsRemaining--
      }
    })
    data = data.map(d => {
      d.cost = parseFloat(d.cost.toFixed(2))
      return d
    })
    console.log(data)
    return data.sort((a, b) => {
      if (a.datetime < b.datetime) return -1
      if (a.datetime > b.datetime) return 1
      return 0
    })
  }

  const chartOptions = {
    chart: {
        type: 'spline'
    },
    title: {
        text: 'Foreast Monitored Resource Costs'
    },
    subtitle: {
        text:
        'Does not include manual or automatically calculated forecasts'
    },
    xAxis: {
      type: 'datetime',
      dateTimeLabelFormats: {
          month: '%b %y',
          year: '%b %y'
      },
      title: {
          text: 'Date'
      }
    },
    yAxis: {
        title: {
            enabled: false
        },
        min: 0
    },
    plotOptions: {
        series: {
            marker: {
                enabled: true,
                radius: 2.5
            },
            allowPointSelect: true,
            // point:{
            //   events:{
            //     select: function(e){
            //       //your logic here
            //       console.log(e.target)
            //     }
            //   }
            // }
        }
    },
    legend: {
      enabled:false
    },
    tooltip: {
        xDateFormat: '%B %d %Y',
        crosshairs: true,
        useHTML:true,
        stickOnContact:true,
        pointFormat: `
        <div style='overflow-y:auto;max-height: 200px'>
          <table>
            <thead>
              <th>
                <b>Total Forecasted Cost:</b>
              </th>
              <th>
                <b>{point.custom.total}</b>
              </th>
            </thead>
            <tbody>
                {point.custom.items}
            </tbody>
          </table>
        </div>`
    },

    series: [{
      name:'All Costs',
      color: 'rgb(244, 126, 67)',
      data: chartData
    }]
  }
  
  return (
    <Layout>
      {data?.user?.login == undefined ?
      <>
        <pre>Please log in</pre>
      </>
      :
      <div className={styles.container}>
        <div className={styles.selector}>
          <div className={styles.selectorDetails}>
          <pre>Logged in as {data?.user?.login}</pre>
          <div>
            <div>
              <div><b>Selected Project(s):</b></div>
              <div>
                {selectedProjects.map(({id, project_number, name}) => {
                  return (
                    <div 
                      onClick={() => handleProjectDeselect(id)}
                      className={styles.projectResultSelected} 
                      key={id}>
                      <b>{project_number}</b> {name}
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              {contentLoading ? 
              <button 
                className={styles.exportButtonDownloading}
                disabled={true}>
                  Loading please wait...
              </button>
              :
              downloading ? 
                <button 
                  disabled={true}
                  className={styles.exportButtonDownloading}
                  >
                    Exporting please wait...
                </button>
                :
                <button 
                  className={styles.exportButton}
                  onClick={() => handleExportMonitoredResources()}>
                    Export Monitored Resources (Weekified)
                </button>
              }
            </div>
          </div>
          <div>
            <input  
              className={styles.search}
              placeholder='Search projects'
              onChange={e => setSearchQuery(e.target.value)}/>
          </div>
          </div>
          <div className={styles.searchResults}>
              {filteredProjects.map(({id, project_number, name}) => {
                return (
                  <div 
                    onClick={() => handleProjectSelect(id)}
                    className={styles.projectResult} 
                    key={id}>
                    <b>{project_number}</b> {name}
                  </div>
                )
              })}
          </div>
        </div>
        <div className={styles.content}>
          {contentLoading ?
          <div className={styles.contentLoaderContainer}>
          <div className='lds-roller'><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
          </div>
          :
          <>
          <div onClick={() => hideChart()}>
            &times;
          </div>
          <div className={styles.chartContainer}>
            <HighchartsReact highcharts={Highcharts} options={chartOptions} />
          </div>
          <div className={styles.monitoredResourceContainer}>     
            <div id={styles['monitoredResourceHeader']} className={`${styles.monitoredResource} tac`}>
              <div>
                Coding
              </div>
              <div>
                Description
              </div>
              <div>
                Start Date
              </div>
              <div>
                End Date
              </div>
              <div>
                Unit Cost
              </div>
              <div>
                Utilization
              </div>
            </div>     
            <div className={styles.forecastContainer}>
              {groupLines(monitoredResources)}
            </div>
          </div>
          </>
          }
        </div>
      </div>
      }
    </Layout>
  )
}
