
$(".property_filters").css('position', 'relative')
$(".property_filters").append("<a id='export_people' class='button' style='position: absolute;bottom: 10px; right: 10px;'>Export Group</button>")
$("#export_people").click(function() {
  $("#export_people").html('Downloading...');
  $("#export_people").attr("disabled", "disabled");
  var api = new mp.api.Base().init();
  var records = mp.report.explore.models.records;
  // Remove default 10,000 record limit
  delete records.params.limit;
  var results = [];
  var deferred = $.Deferred();

  var filterCol = function(col){
    // Used at Bringr
    return col.indexOf('msgCount_') === -1;
  };

  var recursiveEngageQuery = function () {

    if (results.length >= records.total_results) {// end condition
      deferred.resolveWith(this);// resolve deferred
      return;
    }
    api.query('engage', records.params, function(response, request) {

      if (response.error) {
        console.log(response.error);
        return;
      }

      results.push.apply(results, response.results);
      records.params.page = records.params.page + 1;
      recursiveEngageQuery()

    }, records);

    return deferred.promise();// return deferred to $.when
  };

  var processResults = function(){
    results = _.pluck(results, '$properties').map(function(model, i){
      model.$distinct_id = results[i].$distinct_id;
      return model;
    });

    var csv  = toCSV(toTable(getCols(filterCol, results), results));
    $("#export_people").html('Refresh To Enable');
    var csv_data = removeNonAsciiCode(csv);

    var downloadLink = document.createElement("a");
    var blob = new Blob([csv_data],{
      type: "text/csv;charset=utf-8;"
    });
    var blob_url = URL.createObjectURL(blob);
    downloadLink.href = blob_url;
    downloadLink.download = "people.csv";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    // window.open("data:text/csv;base64," + csv_data);
  };

  var getCols = function(filter, data){
    // data   = data || DATA;
    filter = filter || function(){return true;};

    return data.reduce(function(m, line){
      Object.keys(line).map(function(col){
        if(filter(col) && m.indexOf(col) === -1){
          m.push(col);
        }
      });
      return m;
    }, []);
  };

  var addslashes = function(string) {
    return string.replace(/\\/g, '\\\\').
        replace(/\u0008/g, '\\b').
        replace(/\t/g, '\\t').
        replace(/\n/g, '\\n').
        replace(/\f/g, '\\f').
        replace(/\r/g, '\\r').
        replace(/'/g, '\\\'').
        replace(/"/g, '\\"');
  };

  var colValueToExcelCSV = function(val){
    if(typeof val === "number"){return val;}
    return '"'+addslashes(String(val))+'"';
  };

  var toTable = function(cols, data){
    // data = data || DATA;
    var lines = data.map(function(line){
      return cols.map(function(col){
        return line[col] || '';
      });
    });
    return [cols].concat(lines);
  };

  var toCSV = function(table, fFormatter){
    fFormatter = fFormatter || colValueToExcelCSV;
    return table.map(function(lines){
      return lines.map(function(cell){
        return fFormatter(cell);
      }).join(',');
    }).join('\n');
  };

  var removeNonAsciiCode = function(str){
    return str.split('').map(function(c, i){
        return str.charCodeAt(i) > 0xFF ? '?' : c;
    }).join('');
  };

  $.when(recursiveEngageQuery()).done(processResults);
});



