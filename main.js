
/*
 * StackMob JS SDK for Node JS
 * Copyright Clinical Software Solutions Ltd 2013
 * 
 * Released under the MIT License
 *
 * Acknoledgement to Arron Sauders for the original code using
 * the StackMob JS SDK with appcelerator
 * https://gist.github.com/aaronksaunders/5558869
 * 
 */

var fs = require('fs');

// global libraries that are expected to exists
_ = require('underscore');
Backbone = require('backbone');

// Emulate local storage
var LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./stackmob_store');

var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

// Extend the Stackmob object to use the localstorage node module
var NodeStackMob = function(options) {
	var body = fs.readFileSync('./node_modules/stackmob-client/stackmob-js-0.9.2.js', {encoding:'utf8'});
    eval(body);

	StackMob['ajax'] = function(model, params, method, options) {
		params['beforeSend'] = function(xhr, settings) {
			xhr.setRequestHeader("Accept", settings['accepts']);
			if (!_.isEmpty(settings['headers'])) {

				for (key in settings['headers']) {
					xhr.setRequestHeader(key, settings['headers'][key]);
				}
			}
		};

		var error = params['error'];
		params['error'] = function(jqXHR, textStatus, errorThrown) {
			// Workaround for Android broswers not recognizing HTTP status code 206.
			// Call the success method on HTTP Status 0 (the bug) and when a range was specified.
			if (jqXHR.status == 0 && params['query'] && ( typeof params['query']['range'] === 'object')) {
				this.success(jqXHR, textStatus, errorThrown);
				return;
			}
			var responseText = jqXHR.responseText || jqXHR.text;
			StackMob.onerror(jqXHR, responseText, null, model, params, error, options);
		}
		// Set up success callback
		var success = params['success'];
		var defaultSuccess = function(response, status, xhr) {
			var result;

			if (params["stackmob_count"] === true) {
				result = xhr;
			} else if (response && response.toJSON) {
				result = response;
			} else if (response && (response.responseText || response.text)) {
				var json = JSON.parse(response.responseText || response.text);
				result = json;
			} else if (response) {
				result = response;
			}
			StackMob.onsuccess(model, method, params, result, success, options);

		};
		params['success'] = defaultSuccess;

		var xhr = new XMLHttpRequest();

		xhr.open(params.type, params.url);

		xhr.onerror = function() {
			console.log("event xhr.onerror");
	 		params['error'](xhr)
		};

		xhr.onload = function() {
	 		params['success'](xhr);
		};

		params['beforeSend'](xhr, params);
		
		try{
			xhr.send(params.type !== 'GET' ? params.data : null);
		}
		catch(err) {
			console.log("xhr.send exception");
			console.log( err.toJSON() );
		}
	};
	StackMob.init(options);

	return StackMob;
};

module.exports = NodeStackMob;
