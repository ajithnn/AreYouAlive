google.load("visualization", "1", {
    packages: ["table"]
});
google.setOnLoadCallback(InitAllTable);
$(document).ready(function() {
    var myUserName;
    var Socket;
    var DataTableForStatus;
    var TableChartForStatus;
    $("#showSignup").click(function() {
        $('#login').hide();
        $("#SignUp").show();
    });
    $("#showLogin").click(function() {
        $('#login').show();
        $("#SignUp").hide();
        $("#UrlForm").hide();
    });
    $("#btnSubmit").click(function() {
        var username = $("#username").val();
        var password = $("#password").val();
        $.ajax({
            url: "http://localhost:7000/authenticate",
            type: "POST",
            data: {
                'username': username,
                'password': password
            },
            success: function(data) {
                window.sessionStorage.token = data.token;
                myUserName = username;
                $("#login").hide();
                $("#UrlForm").show();
            },
            error: function(err) {
                if (err.status == 401) {
                    alert("User Does not exist. Please check the credentials and try again.")
                } else if (err.status == 500) {
                    alert("There was a server error during the operation. If this persists please contact admin.");
                } else {
                    alert(err);
                }
            }
        });
    });
    $("#urlSubmit").click(function() {
        var urls = [];
        var cont = true;
        var urlexp = new RegExp('(http|ftp|https):\/\/.*');
        $("input[name=url]").each(function() {
            if (urlexp.test($(this).val())) {
                urls.push($(this).val());
            } else {
                alert("URL format should have http:// or https:// prefix.");
                cont = false;
            }
        });
        var dataToSend = {
            'urls': urls,
            'username': myUserName
        };
        if (cont) {
            $.ajax({
                url: "http://localhost:7000/url",
                type: "POST",
                data: dataToSend,
                headers: {
                    'Authorization': 'Bearer ' + window.sessionStorage.token
                },
                success: function(data) {
                    $('#login').hide();
                    $("#SignUp").hide();
                    $("#UrlForm").hide();
                    Socket = io.connect(window.location.origin, {
                        query: "username=" + myUserName
                    });
                    SetSocketListener(Socket);
                },
                error: function(err) {
                    if (err.status == 401) {
                        alert("Token Expired/Not Found - Please login again");
                    } else if (err.status == 500) {
                        alert("There was a server error during the operation. If this persists please contact admin.");
                    } else {
                        alert(err);
                    }
                }
            });
        }
    });
    $("#SignUpSubmit").click(function() {
        var username = $("input[name=Signusername]").val();
        var password = $("input[name=Signpassword]").val();
        var question = $("input[name=question]").val();
        var answer = $("input[name=answer]").val();
        var dataToSend = {
            'username': username,
            'password': password,
            'SecurityQ': question,
            'SecurityA': answer
        };
        $.ajax({
            url: "http://localhost:7000/signup",
            type: "POST",
            data: dataToSend,
            success: function(data) {
                $("#SignUp").hide();
                $("#login").show();
            },
            error: function(err) {
                if (err.status == 409) {
                    alert("Username Already exists");
                } else if (err.status == 500) {
                    alert("There was a server error during the operation. If this persists please contact admin.");
                } else {
                    alert(err);
                }
            }
        });
    });
    $("#showLogout").click(function() {
        $.ajax({
            url: "http://localhost:7000/logout/" + myUserName,
            type: "GET",
            success: function(data) {
                $("#SignUp").hide();
                $("#UrlForm").hide();
                $("#login").show();
                TableChartForStatus.clearChart();
                DataTableForStatus.removeRows(0,DataTableForStatus.getNumberOfRows());
            },
            error: function(err) {
                if (err.status == 500) {
                    alert("There was a server error during the operation. If this persists please contact admin.");
                } else {
                    alert(err);
                }
            }
        });
    });

    function SetSocketListener(Socket) {
        Socket.on("CurrentStatus", function(data) {
            DrawStatusTable(data);
        });
    }

    function DrawStatusTable(data) {
        DataTableForStatus = new google.visualization.DataTable();
        DataTableForStatus.addColumn('string', 'Host Url');
        DataTableForStatus.addColumn('number', 'Status');
        var keys = Object.keys(data);
        for (k in keys) {
            var record = [];
            record.push(keys[k]);
            record.push(data[keys[k]]);
            DataTableForStatus.addRow(record);
        }
        TableChartForStatus = new google.visualization.Table(document.getElementById('StatusTable'));
        var formatter = new google.visualization.ColorFormat();
        formatter.addRange(199, 201, 'white', 'green');
        formatter.addRange(-1, 1, 'white', 'red');
        formatter.format(DataTableForStatus, 1);
        setTimeout(function(){TableChartForStatus.draw(DataTableForStatus, {
            showRowNumber: false,
            allowHtml: true
        });},100);
    }
});

function InitAllTable() {}