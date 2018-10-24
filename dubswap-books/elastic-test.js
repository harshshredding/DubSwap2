var client = require('./elasticsearch/connection.js');



// client.index({  
//   index: 'sentences',
//   type: 'random sentence',
//   body: {
//     "text": "I bobo you so.",
//     "name": "I"
//   }
// },function(err,resp,status) {
//     if (err) {
//         console.log(err);
//     } else {
//         console.log(resp);
//     }
// });


// client.search({  
//   index: 'offerings',
//   type: 'offering',
//   body: {
//     "query": {
//         "match_all" : {}
//     }
//   }
// }, function (error, response,status) {
//     if (error){
//       console.log("search error: "+error)
//     }
//     else {
//       console.log("--- Response ---");
//       console.log(response);
//       console.log("--- Hits ---");
//       response.hits.hits.forEach(function(hit){
//         console.log(hit);
//       })
//     }
// });

client.search({  
  index: 'sentences',
  type: 'random sentence',
  body: {
    "query": {
        "multi_match" : {
            "query" : "bobo",
            "fields" : ["text", "name"]
        }
    }
  }
}, function (error, response,status) {
    if (error){
      console.log("search error: "+error)
    }
    else {
      console.log("--- Response ---");
      console.log(response);
      console.log("--- Hits ---");
      response.hits.hits.forEach(function(hit){
        console.log(hit);
      })
    }
});


// client.indices.create({  
//   index: 'offerings'
// },function(err,resp,status) {
//   if(err) {
//     console.log(err);
//   }
//   else {
//     console.log("create",resp);
//   }
// });

