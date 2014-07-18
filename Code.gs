function doGet(){
  return HtmlService.createTemplateFromFile("index").evaluate();
}

function getAttendees(){
  var sheetId = '0Am50ogq-NXZZdFVrSk5VblIzMlVmcXhPSEdKWUFzV0E';
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  var range = sheet.getRange(2,1, lastRow-1, lastColumn);
  var rangeValues = Utilities.getRowsData(sheet, range, 1);
  
  Logger.log(rangeValues);
  for(var i = 0; i<rangeValues.length; i++){
    Logger.log(i);
    rangeValues[i]['row'] = i + 2;
    Logger.log(rangeValues[i]);
    Logger.log(rangeValues[i]['row']);
  }
  
  return JSON.stringify(rangeValues);
}

function processForm(form){
  Logger.log("Form response:");
  Logger.log(form);
  
  var count = 0;
  var attendeeArray = {};
  var timestamp = null;
  for(var field in form){
    Logger.log(field);
    switch(field){
      case "anon":
        attendeeArray["Anonymous attendees"] = {
          name: "Anonymous attendees",
          guests: Number(form[field])
        }
        break;
        
      case "sunday-date":
        Logger.log(form[field]);
        timestamp = new Date(form[field]);
        Logger.log(timestamp);
        break;
      
      default: 
        var attendeeName = field;
        var numberGuests = 0;
        var rowNumber = 0;
        if(field.indexOf("guests-of-") > -1){
          attendeeName = field.substring(10, field.length);
          numberGuests = Number(form[field]);
        } else {
          rowNumber = Number(form[field]);
        }
        attendeeName = attendeeName.replace(/\-/g, ' ');
        
        if(attendeeArray[attendeeName]){
          attendeeArray[attendeeName].name = attendeeName;
          attendeeArray[attendeeName].guests += numberGuests;
          attendeeArray[attendeeName].row += rowNumber
        } else {
          attendeeArray[attendeeName] = {
            name: attendeeName,
            guests: numberGuests,
            row: rowNumber
          }
        } 
    }
  }
  var ss = SpreadsheetApp.openById('1NboS1P_4kzSawIOagCw1M7PCsbRpvbI5IDYPCyqxAIY').getSheets()[0];
  var finalNumber = getFinalCount(attendeeArray);  
  submitToSpreadsheet(ss, attendeeArray, timestamp);
  //fusionTables.submitToFusionTable('17OzHAJRB299iEC2fiUi2dMCtXpfzsSu5ILAh8ouP', attendeeArray, 'insert');
  return finalNumber;
}  

function submitToSpreadsheet(sheet, data, timestamp){
  var newRow = sheet.getLastRow() + 1;
  var dataArray = convertToArray(data, timestamp);
  
  Utilities.setRowsData(sheet, dataArray, sheet.getRange(1, 1, 1, 4), newRow);
  updateAttendees(data, sheet, timestamp);
}

function convertToArray(data, timestamp){
  var dataArray = [];
  //var timestamp = new Date();
  for(var attendee in data){
    var guests = data[attendee]["guests"];
    var count = guests;
    var name = data[attendee]["name"];
    if(attendee.indexOf("Anonymous attendees") === -1){
      count++;
    }
    var tempObject = {
      "sunday" : timestamp,
      "name" : name,
      "guests" : guests,
      "count" : count
    };
    dataArray.push(tempObject);
  }
  
  return dataArray;
}

function updateAttendees(attendeeData, trackerSheet, timestamp){
  var attendeeSsId = '0Am50ogq-NXZZdFVrSk5VblIzMlVmcXhPSEdKWUFzV0E';
  var sheet = SpreadsheetApp.openById(attendeeSsId).getActiveSheet();
  //var timestamp = new Date();
  delete attendeeData["Anonymous attendees"];
  for(var attendee in attendeeData){
    var attendeeRow = Number(attendeeData[attendee]["row"]);
    Logger.log(attendeeRow);
    
    //Get last visit
    var visitRange = sheet.getRange(attendeeRow, 11);
    var lastVisit = visitRange.getValue();
    Logger.log("Last Visit: " + lastVisit);
    Logger.log("Last Visit Date: " + lastVisit.getDate() + lastVisit.getMonth() + lastVisit.getYear());
    Logger.log("Timestamp: " + timestamp);
    Logger.log("Timestamp Date: " + timestamp.getDate() + timestamp.getMonth() + timestamp.getYear());
    
    //Get sunday count
    var countRange = sheet.getRange(attendeeRow, 12);
    var sundayCount = countRange.getValue();
    Logger.log(sundayCount);
    
    var lastVisitTimeCode = lastVisit.getDate() + lastVisit.getMonth() + lastVisit.getYear();
    var timestampTimeCode = timestamp.getDate() + timestamp.getMonth() + timestamp.getYear();
    if(timestampTimeCode != lastVisitTimeCode){
      //Update last visit
      visitRange.setValue(timestamp);
      Logger.log('updated ' + visitRange + ' to: ' + timestamp)
      
      //Update count of Sundays attended
      sundayCount++;
      Logger.log(sundayCount);
      countRange.setValue(sundayCount);
    } else if(sundayCount === 1){
      Logger.log("It's a new person.");
      //Sometimes there will be new people who have already submitted a connection card that day.
      //The connection card code will send a record to this database.
      //Rather than double counting them, this just updates the current record.
      trackerSheet.deleteRow(trackerSheet.getLastRow());
      var newAttendeeRow = -1;
      Logger.log(timestamp);
      Logger.log(trackerSheet.getDataRange().getValues()[1][0]);      
      Logger.log(trackerSheet.getDataRange().getValues()[1][1]);
      var newAttendeeRow = Utilities.findRowBy2(trackerSheet.getDataRange().getValues(), 0, timestamp, 1, attendee, 0);
      Logger.log("new attendee row: " + newAttendeeRow);
      Logger.log("Data: \r\n" + trackerSheet.getDataRange().getValues());
      if(newAttendeeRow > -1){
        var guestCount = attendeeData[attendee]["guests"];
        Logger.log(guestCount);
        if(guestCount > 0){
          Logger.log("add some guests!");
          var guestRange = trackerSheet.getRange(newAttendeeRow, 3);
          guestRange.setValue(guestCount);
          var fullCount = guestCount + 1;
          var countRange = trackerSheet.getRange(newAttendeeRow, 4)
          countRange.setValue(fullCount);
        }
      }
    }
  }
}

/********************************************
** COUNT FUNCTION FOR TRACKING JUST COUNT **
********************************************/

function getFinalCount(attendees){
  var count = 0;
  for(var attendee in attendees){
    count++;
    count += attendees[attendee]["guests"];
  }
  count-- //subtract 1 for the anonymous attendee
  Logger.log(count)
  return count;
}
