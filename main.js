const puppeteer = require("puppeteer");
const express = require("express");
const app = express();
const fs = require("fs");
const multer = require("multer");
const upload = multer();
const insta_url = "https://www.instagram.com/accounts/login/"
let isAuth = false;
let curUser;
const {
    getStories,
    getStoriesFeed
} = require("./helperFn");
const mongoose = require("mongoose");
const dotenv = require('dotenv');
dotenv.config();
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static(__dirname + "/public"));


mongoose.connect(
    process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
const storySchema = new mongoose.Schema({
    username: String,
    storyURL: String,
});

const story = mongoose.model('story', storySchema)

async function scrape(userName, pswd, isAuth) {
    let arr = [];
    let final = [];
    let obj = {};

    let insta_session2 = await init(userName, pswd);
    console.log(insta_session2);
    let user_id = insta_session2.split("%")[0];
    console.log(user_id);

    // getStoriesObj.getStoriesFN({
    //     user_id,
    //     insta_session2,
    // });

    getStoriesFeed({
        userid: user_id,
        userid: user_id,
        sessionid: insta_session2,
    }).then((feed) => {
        for (let i in feed.tray) {
            console.log(feed.tray[i].user.pk);
            arr.push(feed.tray[i].user.pk);
            // console.log();
        }
        for (let i = 0; i < arr.length; i++) {
            getStories({
                id: arr[i],
                userid: user_id,
                sessionid: insta_session2,
            }).then((stories) => {
                for (let i in stories.items) {
                    if (stories.items[i]["video_versions"] === undefined) {
                        console.log("Skipped");
                    } else {
                        let name = stories.user.username;
                        obj = {
                            id: stories.items[i].user.pk,
                            name: stories.user.username,
                            url: stories.items[i].video_versions[0].url,
                            item: i,
                        }
                        final.push(obj);

                        // final.push = {
                        //     id: stories.items[i].user.pk,
                        //     name: stories.user.username,
                        //     url: stories.items[i].video_versions[0].url,
                        //     item: i,
                        // };
                        story.create({
                                username: userName,
                                storyURL: stories.items[i].video_versions[0].url
                            },
                            function (err) {
                                if (err) throw new Error(err);
                            }
                        );
                    }
                    // console.log(final);

                }

                if (fs.existsSync("vidsss.json") == false) {
                    fs.writeFileSync("vidsss.json", JSON.stringify(final));
                } else {
                    let data = fs.readFileSync("vidsss.json", "UTF-8");
                    if (data.length == 0) {
                        data = [];
                    } else {
                        // console.log(data);
                        data = JSON.parse(data);
                    }
                    data.push(obj);
                    fs.writeFileSync("vidsss.json", JSON.stringify(final));
                }

                // fs.writeFileSync("vidsss.json", JSON.stringify(final));
            });
        };

    });
};


async function init(userName, pswd) {
    let insta_session;
    let my_user_id;
    try {
        let browser = await puppeteer.launch({
            headless: true,
            defaultViewport: null,
            args: ["--start-maximized"]
        });
        let pageArr = await browser.pages();
        let page = pageArr[0];
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36');
        await page.goto("https://www.instagram.com/accounts/login/", {
            timeout: 60000,
            waitUntil: "domcontentloaded",
        });
        await page.waitForSelector("input[name='username']", {
            visible: true
        });
        await page.type("input[name='username']", userName);
        await page.type("input[type='password']", pswd);

        await page.waitForTimeout(1000);
        await page.click(".sqdOP.L3NKy.y3zKF");

        await page.waitForTimeout(5000);
        const cookies = await page.cookies();
        for (let i in cookies) {
            if (cookies[i]["name"] === "sessionid") {
                insta_session = cookies[i].value;
            }
        }
        await page.waitForTimeout(3000);
        await browser.close();
    } catch (err) {
        console.log(err);
    }
    return insta_session

};
//root
app.get("/", function (request, response) {
    response.sendFile("./public/index.html");
});
app.get("/added", function (request, response) {
    response.sendFile("./public/added.html", {
        root: __dirname
    });
});



app.get("/stories", async (request, response) => {
    if (isAuth === true) {
        const data = await story.find({});
        data.forEach(function (i) {
            if (i.username === curUser) {
                res = `<h2>YOUR STORIES -> @ ${i.username}</h1>`;
                let index = 0;
                if (data.length == 0) {
                    res += "<h3>No added stories</h3>";
                } else {
                    data.forEach(function (i) {
                        if (i.username === curUser) {
                            res += `<body style="background-color:#a2b9bc;display:flex;flex-direction: column;flex-wrap: wrap;"><div><a href=${i.storyURL}><li>Click</li></a></div></div></body>`
                        }
                    });
                }
                res += '<h3><a href="/">HOME</a></h3>';
                response.send(res);
            } else {
                let res = `<h2>NO STORY FOUND </h1>`;
                response.send(res);
            }
        });
    } else {
        let res = `<h2>YOUR STORIES</h1><div>AUTHENTICATE FIRST</div>`;
        response.send(res);
    }

});

app.post("/scrape", upload.none(), async (request, response) => {
    let req = request.body;
    if (req.userName == "" || req.pswd == "") {
        console.log("Please enter username and password");
        response.redirect("/error.html");
        return;
    }
    console.log("Running for " + req.userName);
    try {
        await scrape(req.userName, req.pswd);
        curUser = req.userName;
        isAuth = true;
    } catch (e) {
        console.log(e);
        response.redirect("/error.html");
        return;
    }

    response.redirect("/added");
});


app.post("/login", upload.none(), async (request, response) => {
    let req = request.body;
    let insta_session2;
    if (req.userName == "" || req.pswd == "") {
        console.log("Please enter username and password");
        response.redirect("/error.html");
        return;
    }
    console.log("Running for " + req.userName);
    try {
        insta_session2 = await init(req.userName, req.pswd)
        // await scrape(req.userName, req.pswd);
        curUser = req.userName;
        isAuth = true;
    } catch (e) {
        console.log(e);
        isAuth = false;
        response.redirect("/error");
        return;
    }
    response.redirect("/");
});




let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}
app.listen(port);
console.log("App is runung on port " + port);