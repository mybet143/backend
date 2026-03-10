require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");
const NodeCache = require("node-cache");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

const Admin = require("./models/Admin");
const Message = require("./models/Message");
const MarketControl = require("./models/MarketControl");
const Banner = require("./models/Banner");
const auth = require("./middleware/auth");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://mybet.mobi",
      "https://www.mybet.mobi"
    ]
  }
});

let mongoConnected = false;

app.use(cors({
  origin:[
    "http://localhost:5173",
    "https://mybet.mobi",
    "https://www.mybet.mobi"
  ],
  credentials:true
}));

app.use(express.json());
app.use("/uploads", express.static("uploads"));

const cache = new NodeCache({ stdTTL: 300 });

/* ================= BASIC ROUTE ================= */

app.get("/", (req,res)=>{
  res.send("Backend Running 🚀");
});

/* ================= SOCKET ================= */

io.on("connection",(socket)=>{

  socket.on("joinMarket",(marketName)=>{
    socket.join(marketName);
  });

  socket.on("sendMessage",async({marketName,username,message})=>{
    const newMessage = await Message.create({
      marketName,
      username,
      message
    });

    io.to(marketName).emit("receiveMessage",newMessage);
  });

});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});



const upload = multer({ storage });
// ================= BASIC ROUTE =================
app.get("/", (req, res) => {
  res.send("Backend Running 🚀");
});

// ================= SOCKET =================
io.on("connection", (socket) => {
  socket.on("joinMarket", (marketName) => {
    socket.join(marketName);
  });

  socket.on("sendMessage", async ({ marketName, username, message }) => {
    const newMessage = await Message.create({
      marketName,
      username,
      message,
    });

    io.to(marketName).emit("receiveMessage", newMessage);
  });
});

// ================= SCRAPE FROM SATTA SITE =================


// ================= ULTRA SCRAPER =================

const SOURCES = [

  "https://dpboss.net.in",
   "https://sattamatka.world/",
  "https://spboss.mobi/"

];


let marketsCache=[]

const updateMarkets = async ()=>{
  try{
    const markets = await scrapeMarkets()

    if(markets.length){
      marketsCache = markets
      cache.set("markets",markets)
      io.emit("marketsUpdate",markets)
      console.log("AUTO UPDATE SUCCESS")
    }

  }catch(e){
    console.log("AUTO SCRAPER ERROR")
  }
}

updateMarkets()
setInterval(updateMarkets,60000)



const fetchHTML = async (url) => {
  try {

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
        Connection: "keep-alive"
      },
    timeout: 7000
    });

    return response.data;

  } catch (err) {
    console.log("SCRAPE ERROR:", url);
    throw err;
  }
};

const parseMarkets = (html) => {

const $ = cheerio.load(html)
const markets = []
const seen = new Set()

$("body *").each((i,el)=>{

const text=$(el).text().trim()

const match = text.match(/([A-Za-z ]+)\s+(\d{2,3}\s*-\s*\d{1,2}\s*-\s*\d{2,3}|\d{2,3}\s*-\s*\d{1,2}|Loading)/i)
const timeMatch=text.match(/(\d{1,2}:\d{2}\s?(AM|PM))\s*(\d{1,2}:\d{2}\s?(AM|PM))/i)

if(match){

const name=match[1].trim()
let result = match[2].replace(/\s+/g,"").trim()

if(result.toLowerCase()==="loading"){
result=""
}

let time=""

if(timeMatch){
time = `${timeMatch[1]} - ${timeMatch[3]}`
}

if(!seen.has(name) && name.length<40){

seen.add(name)

markets.push({
marketName:name,
marketResult:result,
marketTime:time
})

}

}

})

return markets

}


const scrapeMarkets = async () => {

let allMarkets = []
const seen = new Set()

for (const source of SOURCES) {

try {

console.log("SCRAPING:", source)

const html = await fetchHTML(source)

const markets = parseMarkets(html)

console.log(`FOUND ${markets.length} MARKETS FROM ${source}`)

markets.forEach(m => {

if(!seen.has(m.marketName)){

seen.add(m.marketName)
allMarkets.push(m)

}

})

} catch (err) {

console.log("FAILED SOURCE:", source)

}

}

console.log("TOTAL UNIQUE MARKETS:", allMarkets.length)

return allMarkets

}


// ================= MATKA API =================
// ================= MATKA API =================

app.get("/api/matka", async (req, res) => {
  try {
    let markets = cache.get("markets");

    if (!markets) {
      markets = await scrapeMarkets();

      if (markets.length) {
        cache.set("markets", markets);
      }
    }

let controls = [];

try {
  controls = await MarketControl.find().lean();
} catch (err) {
  console.log("DB ERROR:", err.message);
}

    const visibilityMap = {};
    controls.forEach((c) => {
      visibilityMap[c.marketName] = c.isVisible;
    });

    const finalMarkets = markets.filter((m) => {
      if (visibilityMap[m.marketName] === undefined) return true;
      return visibilityMap[m.marketName];
    });

    res.json({
      success: true,
      total: finalMarkets.length,
      data: finalMarkets,
    });
  } catch (err) {
    console.log("MATKA ERROR:", err.message);

    res.json({
      success: true,
      data: [],
    });
  }
});
// ================= CHART API =================
// ================= CHART API =================
app.get("/api/chart/:market", async (req, res) => {

  try {

    const market = req.params.market;


const slug = market
.toLowerCase()
.replace(/\s+/g,"-")
.replace("day","")
.replace("night","")

const urls = [

`https://spboss.mobi/jodi/${slug}.php`,
`https://spboss.mobi/panel/${slug}.php`,

`https://sattamatkadpboss.co/record/${slug}-chart.php`,
`https://dpboss.net/record/${slug}-chart.php`

]

    let html = null;

    for (const url of urls) {

      try {

        const response = await axios.get(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
         timeout: 7000
        });

        html = response.data;

        if (html && html.length > 500) break;

      } catch (err) {}

    }

    if (!html) {

      return res.json({
        success: true,
        hasChart: false,
        data: []
      });

    }

    const $ = cheerio.load(html);

    let table;
    let type = "jodi";

if ($("table.jodi-content-chart").length) {

table = $("table.jodi-content-chart")
type = "jodi"

}

else if ($("table.pchart").length) {

table = $("table.pchart")
type = "panel"

}

else if ($("table.chat7").length) {

table = $("table.chat7")
type = "jodi"

}
else if ($("table.chat7").length) {

  table = $("table.chat7")
  type = "jodi"

}
    else {

      return res.json({
        success: true,
        hasChart: false,
        data: []
      });

    }

    const chartData = [];

    table.find("tr").each((i, row) => {

      const cols = [];

$(row).find("td,th").each((j,col)=>{

let value

if(type==="panel"){

let html=$(col).html()||""

value = html
.replace(/<br\s*\/?>/gi,"\n")
.replace(/<span[^>]*>/gi,"")
.replace(/<\/span>/gi,"")
.replace(/\n\s*\n/g,"\n")
.trim()

}else{

value=$(col).text().trim()

}

if(value==="*" || value==="**") value="**"

if(!value) value="-"

cols.push(value)

})

      if (cols.length > 0) chartData.push(cols);

    });

    res.json({
      success: true,
      type,
      hasChart: chartData.length > 0,
      data: chartData
    });

  } catch (err) {

    console.log("CHART ERROR:", err.message);
    console.log("FETCHING CHART FOR:", market)
console.log("TRY URL:", url)

    res.json({
      success: true,
      hasChart: false,
      data: []
    });

  }

});
// ================= ADMIN MARKETS =================
app.get("/api/admin/all-markets", async (req, res) => {
  const markets = await scrapeMarkets();
  res.json({ success: true, data: markets });
});

app.get("/api/admin/markets", async (req, res) => {
  const controls = await MarketControl.find();
  res.json({ success: true, data: controls });
});

app.post("/api/admin/markets/update", async (req, res) => {
  try {
    const { markets } = req.body;

    for (let m of markets) {
      await MarketControl.findOneAndUpdate(
        { marketName: m.marketName },
        { isVisible: m.isVisible },
        { upsert: true }
      );
    }

    res.json({ success: true });

  } catch (err) {
    res.json({ success: false });
  }
});

// ================= LOGIN =================
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;

  const admin = await Admin.findOne({ username });
  if (!admin) return res.status(400).json({ message: "Invalid" });

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) return res.status(400).json({ message: "Invalid" });

  const token = jwt.sign(
    { id: admin._id },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "1d" }
  );

  res.json({ token });
});

// Create or Update Banner
app.post(
  "/api/admin/banner",
  auth,
  upload.fields([
    { name: "desktop", maxCount: 1 },
    { name: "tablet", maxCount: 1 },
    { name: "mobile", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { title, buttons, desktopFocus, tabletFocus, mobileFocus } = req.body;

      let banner = await Banner.findOne();

      const makeUrl = (file) =>
        `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;

      const parsedButtons = buttons ? JSON.parse(buttons) : [];

      const updateData = {
        title,
        buttons: parsedButtons
      };

      if (req.files.desktop) {
        updateData.desktop = {
          url: makeUrl(req.files.desktop[0]),
          focus: desktopFocus || "center center"
        };
      }

      if (req.files.tablet) {
        updateData.tablet = {
          url: makeUrl(req.files.tablet[0]),
          focus: tabletFocus || "center center"
        };
      }

      if (req.files.mobile) {
        updateData.mobile = {
          url: makeUrl(req.files.mobile[0]),
          focus: mobileFocus || "center center"
        };
      }

      if (banner) {
        Object.assign(banner, updateData);
        await banner.save();
      } else {
        banner = await Banner.create(updateData);
      }

      res.json({ success: true });

    } catch (err) {
      console.log(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

app.get("/api/banner", async (req, res) => {
  try {
    const banner = await Banner.findOne();
    res.json({ success: true, data: banner });
  } catch (err) {
    res.json({ success: false });
  }
});


// ================= START =================
const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {

    await mongoose.connect(process.env.MONGO_URI,{
      serverSelectionTimeoutMS:30000
    });

    console.log("MongoDB Connected ✅");

    server.listen(PORT,()=>{
      console.log(`Server running on port ${PORT}`);
    });

  } catch(err){
    console.log("Mongo Error:",err.message);
  }
};
startServer();