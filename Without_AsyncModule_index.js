var request = require('request');
var urls = ['http://localhost:8000/','http://localhost:9000/'];
var responses = [];
var numOfResponse = 0;
for(url in urls)
{
	var curObj = {};
	curObj[urls[url]] = 0;
	request(urls[url], function (error, response, body) {
  	if (!error) {
		numOfResponse++;
		curObj["http://" + response.socket._httpMessage._headers.host + "/"] = response.statusCode;
  	}
	else{
		numOfResponse++;
	}
	if(numOfResponse==2){
                console.log(curObj);
        }
})
}
