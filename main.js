const envDev = "https://api.iot.ifra.io"
var token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2ODE0ODUzNTMsImlkIjo4NDQsInR5cGUiOiJhY2Nlc3MifQ.P2nNFFjaYTrwMtdCPNXC0qrEeQ_dAWoz1BpPKksHw8Y"
var url = envDev
/**
 * Get all machine Ex: IFRA_MACHINES()
 */
function IFRA_MACHINES() {
  try {
    var url =  this.url+`/v1/machines`;
    var options = {
      method : "GET",
      contentType: "application/json",
      headers: {
        Authorization: 'Bearer ' + this.token,
      } 
    }
    var response = UrlFetchApp.fetch(url, options);
    var json = response.getContentText()
    var data = JSON.parse(json)
    Logger.log(data);
    var ret = []
    var b = []
    var headers = ["ID", "Name", "Ideal cycle time","Unit"]
    ret.push(headers)
    for (var i = 0;i < data.result.rows.length; i++) {
      b.push(data.result.rows[i].machineInfo.id)
      b.push(data.result.rows[i].machineInfo.name)
      b.push(data.result.rows[i].machineInfo.idealCycleTime)
      b.push(data.result.rows[i].machineInfo.idealCycleTimeUnit)
      ret.push(b)
      b = []
    }
    return ret
  }  catch(err){
    return "Error : " + err;  
  }
}
/**
 * Get machine status Ex: IFRA_MACHINE_STATUS("01/12/2022 00:00:00","31/12/2022 00:00:00","HOUR","1,..","0,..")
 * @param DateFrom: start date format DD/MM/YYYY hh24:mm:ss
 * @param DateTo: end date format DD/MM/YYYY hh24:mm:ss
 * @param groupByTime as string Ex HOUR | DAY | MONTH | YEAR
 * @param MachinesID for   1,2,..
 * @param StatusID 0,1,.. [0 = down , 1 = run , 2 = waiting]
 */
function IFRA_MACHINE_STATUS(DateFrom,DateTo,groupByTime,MachinesID,StatusID) {
  return reportBuild(DateFrom,DateTo,groupByTime,MachinesID,StatusID)
}

function IFRA_MACHINE_TOTAL_OUTPUT(DateFrom,DateTo,groupByTime,MachinesID) {
  return reportBuild(DateFrom,DateTo,groupByTime,MachinesID,"8")
}

function IFRA_MACHINE_REJECT_OUTPUT(DateFrom,DateTo,groupByTime,MachinesID) {
  return reportBuild(DateFrom,DateTo,groupByTime,MachinesID,"10")
}

function IFRA_MACHINE_AVG_TOTAL_OUTPUT(DateFrom,DateTo,groupByTime,MachinesID) {
  try {
    var bs = []
    var dID =  getDevicesID(MachinesID)
    var dataM = getMeasurements(dID)
    var bKPIs = createModelForBasicKPIs(dataM,"AVG","mc_op","AVG Total Output")
    bs.push(bKPIs)
    let dateF =  strToDate(DateFrom).toISOString()
    let dateT = strToDate(DateTo).toISOString()
    var data = {
        'basicKPIs':  bs,
        'startDateTime': dateF,
        'endDateTime': dateT,
        'groupBy' : groupByTime,
        'kpiIDs' : []
      };
      var url =  this.url+`/v1/report/build`;
      var options = {
        'method' : 'POST',
        'contentType': 'application/json',
        'payload':  JSON.stringify(data),
        'headers': {
          Authorization: 'Bearer ' + this.token,
        } 
      }
      var response = UrlFetchApp.fetch(url, options);
      var json = response.getContentText()
      var data = JSON.parse(json)
      Logger.log(data);
      var ret = []
      ret.push(data.result.table.columns)
      for (var i = 0;i < data.result.table.data.length; i++) {
        var dateFormat = new Date( Date.parse(data.result.table.data[i][0]))
      var t = String(dateFormat.getDate()).padStart(2,'0')+
           "/"+ String(dateFormat.getMonth()+1).padStart(2,'0')+
           "/"+dateFormat.getFullYear()+
           " "+String(dateFormat.getHours()).padStart(2,'0')+
           ":"+String(dateFormat.getMinutes()).padStart(2,'0')+
           ":"+String(dateFormat.getSeconds()).padStart(2,'0')
      //  data.result.table.data[i][0] = dateFormat.toLocaleString("th")
       data.result.table.data[i][0] = t
        ret.push(data.result.table.data[i])
      }
      return ret
  } catch(err) {
    return "Error : " + err; 
  }
}

function createModelForBasicKPIs(rawData,aggName,measurementName,name) {
  let id = ""
  for (var i = 0;i < rawData.length; i++) {
    if (rawData[i][1] == measurementName) {
      id = rawData[i][0]
    }
  }
  if (id == "") {
    return new Error("MeasurementID not found")
  }
  var data = {
    "aggregator" : aggName,
    "id":  id + "-"+ aggName , 
    "measurementId": Number(id),
    "measurementName":measurementName,
    "name": name
  }
  return data
}

function getMeasurements(deviceID) {
  try {
    var url =  this.url+`/v1/devices/`+deviceID+`/measurements`;
    var options = {
      method : "GET",
      contentType: "application/json",
      headers: {
        Authorization: 'Bearer ' + this.token,
      } 
    }
    var response = UrlFetchApp.fetch(url, options);
    var json = response.getContentText()
    var data = JSON.parse(json)
    Logger.log(data);
    if (data.result.rows.length == 0) {
        return new Error("Measurement not found")
    }
    var ret = []
    var b = []
    for (var i = 0;i < data.result.rows.length; i++) {
      b.push(data.result.rows[i].id)
      b.push(data.result.rows[i].name)
        ret.push(b)
      b = []
    }
    return ret
  }  catch(err){
    return "Error : " + err;  
  }
}

function getDevicesID(thingID) {
  try {
    var url =  this.url+`/v1/things/`+thingID+`/devices`;
    var options = {
      method : "GET",
      contentType: "application/json",
      headers: {
        Authorization: 'Bearer ' + this.token,
      } 
    }
    var response = UrlFetchApp.fetch(url, options);
    var json = response.getContentText()
    var data = JSON.parse(json)
    Logger.log(data);
    if (data.result.rows.length == 0) {
        return new Error("Device not found")
    }
    return data.result.rows[0].id
  }  catch(err){
    return "Error : " + err;  
  }
}

function reportBuild(DateFrom,DateTo,groupByTime,MachinesID,StatusID) {
  try {
      if(!DateFrom || !DateTo || !MachinesID || !StatusID || !groupByTime) return "Parameter not found"
      var sIDs = []
      var mIDs = []
      var map = new Map()
      map.set(0, 16)
      map.set(1, 17)
      map.set(2, 20)
      map.set(8,8)
      map.set(10,10)
      let datF =  strToDate(DateFrom).toISOString()
      let datT = strToDate(DateTo).toISOString()
      var mID = MachinesID.split(",")
      var sID = StatusID.split(",")
      var mIDObj = Object.keys(mID).map((key) => [Number(mID[key])])
      mIDObj.forEach(id => mIDs.push(Number(id) ))
      var sIDObj = Object.keys(sID).map((key) => [Number(sID[key])])
      sIDObj.forEach(id => {sIDs.push(map.get( Number(id)))})
      var data = {
        'startDateTime': datF,
        'endDateTime': datT,
        'filter' : {
          'machineIDs' : mIDs,
        },
        'groupBy' : groupByTime,
        'kpiIDs' : sIDs
      };
      var url =  this.url+`/v1/report/build`;
      var options = {
        method : "POST",
        contentType: "application/json",
        payload:  JSON.stringify(data),
        headers: {
          Authorization: 'Bearer ' + this.token,
        } 
      }
      var response = UrlFetchApp.fetch(url, options);
      var json = response.getContentText()
      var data = JSON.parse(json)
      Logger.log(data);
      var ret = []
      ret.push(data.result.table.columns)
      for (var i = 0;i < data.result.table.data.length; i++) {
        var dateFormat = new Date( Date.parse(data.result.table.data[i][0]))
        var t = String(dateFormat.getDate()).padStart(2,'0')+
           "/"+ String(dateFormat.getMonth()+1).padStart(2,'0')+
           "/"+dateFormat.getFullYear()+
           " "+String(dateFormat.getHours()).padStart(2,'0')+
           ":"+String(dateFormat.getMinutes()).padStart(2,'0')+
           ":"+String(dateFormat.getSeconds()).padStart(2,'0')
      //  data.result.table.data[i][0] = dateFormat.toLocaleString("th")
       data.result.table.data[i][0] = t
        ret.push(data.result.table.data[i])
      }
      return ret
  } catch(err){
    return "Error : " + err;  
  }
}

function strToDate(dtStr) {
  if (!dtStr) return null
  let dateParts = dtStr.split("/");
  let timeParts = dateParts[2].split(" ")[1].split(":");
  dateParts[2] = dateParts[2].split(" ")[0];
  return dateObject = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1], timeParts[2]);
}

