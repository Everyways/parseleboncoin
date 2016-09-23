var express = require('express');
var nodemailer = require('nodemailer');
var smtpTransport = require("nodemailer-smtp-transport");
var cron = require('node-cron');
var app = express();
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');

const ANTERIORITY = 12;
const STOCK_FILE = 'sauv.txt';

var smtpTransport = nodemailer.createTransport(
	smtpTransport({
		service: "Gmail",
		secureConnexion: false,
		port: 587,
		auth: {
			user: "yourmail",
			pass: "yourPass"
		}
	})
);

var params = {
						'from': 'veilleNodeJsleboncoin@gmail.com',
						'to': 'youremail',
						'subject': 'veille leboncoin ✔'
				};

var processParse = function() {
	var url = 'http://www.leboncoin.fr/annonces/offres/provence_alpes_cote_d_azur/alpes_maritimes/?q=velo appartement programme&sp=1';
	var retours = [];
	request(url, function(error, response, html){
		if(!error){
			var $ = cheerio.load(html);
			var title, release, rating;

			$("section.tabsContent ul li").filter(function() {
				var datas = $(this);
				datas.each(function(index, value) {
					var flag = 100;
					var title = $(this).find('h2.item_title').text();
					var price = $(this).find('h3.item_price').text();
					var href = $(this).find('a.list_item').attr('href');
					var globDate = $(this).find('aside.item_absolute');
					var stringDate = globDate.find('p.item_supp').text().trim();
					var aDate = stringDate.split(" ");
					var checkFlag = parseInt(price.match(/\d+/g));
					var today = new Date();
					var year = today.getFullYear();
					var month = aDate[1].substr(0, aDate[1].length -1);
					var monthNumber = ["janv", "fevrier", "mars", "avril", "mai", "juin", "juillet", "ao&ucirc;t", "sept", "oct", "nov", "dec"].indexOf(month.toLowerCase()) + 1;
					monthNumber = monthNumber > 9 ? "" + monthNumber : "0" + monthNumber;
					var day = aDate[0] > 9 ? "" + aDate[0] : "0" + aDate[0];
					var itemDate = new Date(year, monthNumber -1, day);
					var milliS = 1000 * 60 * 60 * 24 * ANTERIORITY;
					var maxDate = new Date(today - milliS);
					// Check date
					// console.log('date item '+itemDate.toLocaleString()+' > date max '+maxDate.toLocaleString());
					if(maxDate < itemDate) {
						//Check price
						if(checkFlag <= flag) {
							var item = [
									titre = title.trim(),
									prix = price.trim(),
									datePublication = itemDate,
									href = href.trim()
							];
							retours.push(item);
						}
					}
				});
			})
		} else {
			console.log(error);
		}
		// chieck if different. If true write the file and send email
		var currentFile = fs.readFileSync('./'+STOCK_FILE, 'utf-8');
		var test = '';

		retours.forEach(function(v) {
			test += v.join(', ') + '\n';
		})
		if(currentFile !== test) {
			var file = fs.createWriteStream(STOCK_FILE);
			file.on('error', function(err) {
				console.log(error);
			})
			retours.forEach(function(v) {
				file.write(v.join(', ') + '\n');
			})
			file.end();

			// Email
			var mailOptions = {
				from: params.from,
				to: params.to,
				subject: params.subject,
				text: JSON.stringify(retours)
			}
			smtpTransport.sendMail(mailOptions, function(error, infos) {
				if(error) {
					console.log(error);
				} else {
					console.log("message envoye : infos -> "+infos.response);
				}
			})
		}
	})
}

cron.schedule('* * * * *', function(){
  console.log('je lance processParse');
	processParse();
});
