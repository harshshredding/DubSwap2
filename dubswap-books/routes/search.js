// Dependencies
// ***********************************
var express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    pool = require('../db/db-module.js'),
    user = require('../test/test-email-verification/sendEmail.js'),
    passport = require('../config/passport.js'),
    session = require('express-session'),
    bcrypt = require("bcrypt"),
    emailer = require('../test/test-email-verification/sendEmail.js'),
    helper = require('../helper.js');
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var elasticClient = require("../elasticsearch/connection.js");

module.exports = function(app){

    // A route that handles the search queries
    app.get("/search", async function(req, responseHTTP, next) {
        var query = req.query.query;
        var searchResult;
        
        // find search results
        try {
            searchResult = await elasticClient.search({
                index: 'offerings',
                type: 'offering',
                body: {
                    "query": {
                        "multi_match": {
                            "query": query,
                            "fields": ["description", "item", "course", "author"]
                        }
                    }
                }
            });
            // print result
            console.log(searchResult);
        } catch (err) {
            console.log("Error while performing search using elasticsearch.");
            next(err);
        }
        
        var offeringIdList = [];
        // Add all the ids of the results to a list
        searchResult.hits.hits.forEach(function(hit) {
                    offeringIdList.push(hit._id);
                }); 
                
        // If we found no results.        
        if (offeringIdList === undefined || offeringIdList.length == 0) {
            // array empty or does not exist
            responseHTTP.render("search-result", {
                    allResults: "",
                    imagesScript: "",
                    username: null, 
                    hasNoResults: true
            });
            return ;
        }
        
        // find all offerings corresponding to the results.
        var offerings;
        try {
            offerings = await pool.query("SELECT * FROM offerings WHERE offering_id IN (" + offeringIdList.join(',') + ");");
        } catch (err) {
            console.log("Error while finding offerings corresponding to elasticsearch results");
            next(err);
        }
        
        // make html for all the offerings we want to render
        var htmlResult = "";
        var imagesScript = "";
        for (var i = 0; i < offerings.rowCount; i++) {
            var rowData = offerings.rows[i];
            var itemName = rowData.item;
            var price = rowData.price;
            var display_pic = helper.convertHexToBase64(rowData.image_1);
            var offering_id = rowData.offering_id;
    
            // The structures that will contain the offering information. 
            htmlResult +=
                "<div class='column1'>" +
    
                "<a href = 'offering/" + offering_id + "'>" +
                "<img class='offering-image' src='' id='offering" + offering_id + "'>" +
                "</a>" +
    
                "<div class='d-flex flex-column card-text'>" +
                "<div class='card-item'>" + price + "$</div>" +
                "<div class='card-item'>" + itemName + "</div>" +
                "</div>"
    
                +
                "</div>";
    
            // This javascript will embed the pictures. 
            imagesScript += "document.getElementById(\"offering" + offering_id + "\").src = \"data:image/jpg;base64,\" + \"" + display_pic + "\";";
        }
        
        // Render Search Results HTML.
        responseHTTP.render("search-result", {
            allResults: htmlResult,
            imagesScript: imagesScript,
            username: null,
            hasNoResults: false
        });
    });
};