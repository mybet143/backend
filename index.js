// require("dotenv").config();
// const express = require("express");
// const http = require("http");
// const { Server } = require("socket.io");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const axios = require("axios");
// const cheerio = require("cheerio");
// const NodeCache = require("node-cache");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const multer = require("multer");
// const path = require("path");
// const Admin = require("./models/Admin");
// const Message = require("./models/Message");
// const MarketControl = require("./models/MarketControl");
// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, { cors: { origin: "*" } });
// const Banner = require("./models/Banner");
// const auth = require("./middleware/auth");
// app.use(cors());
// app.use(express.json());
// // Serve uploaded images
// app.use("/uploads", express.static("uploads"));
// const cache = new NodeCache({ stdTTL: 300 });



// // ================= MONGODB =================
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("MongoDB Connected ✅"))
//   .catch(err => console.log("Mongo Error:", err));






//   // ================= IMAGE UPLOAD CONFIG =================





// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "uploads/");
//   },
//   filename: function (req, file, cb) {
//     const uniqueName =
//       Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, uniqueName + path.extname(file.originalname));
//   },
// });



// const upload = multer({ storage });
// // ================= BASIC ROUTE =================
// app.get("/", (req, res) => {
//   res.send("Backend Running 🚀");
// });

// // ================= SOCKET =================
// io.on("connection", (socket) => {
//   socket.on("joinMarket", (marketName) => {
//     socket.join(marketName);
//   });

//   socket.on("sendMessage", async ({ marketName, username, message }) => {
//     const newMessage = await Message.create({
//       marketName,
//       username,
//       message,
//     });

//     io.to(marketName).emit("receiveMessage", newMessage);
//   });
// });

// // ================= SCRAPE FROM SATTA SITE =================


// const scrapeMarkets = async () => {
//   try {

//     const { data } = await axios.get("https://sattamatkadpboss.co", {
//       headers: {
//         "User-Agent":
//           "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
//       },
//       timeout: 15000,
//     });

//     const $ = cheerio.load(data);

//     const result = [];
//     const seen = new Set();

// const elements = $(".news-body > div").toArray();

// for (const el of elements) {

//   const text = $(el).text().trim();

//   if (!text) continue;

//   const lines = text
//     .split("\n")
//     .map(l => l.trim())
//     .filter(Boolean);

//   if (!lines.length) continue;

//   const name = lines[0].replace(/[{}]/g, "").trim();

//   if (
//     !name ||
//     seen.has(name) ||
//     name.toLowerCase() === "jodi" ||
//     name.toLowerCase() === "panel"
//   ) continue;

//   seen.add(name);

//   const resultMatch = text.match(
//     /\d{2,3}-\d{1,2}-\d{2,3}|\d{2,3}-\d{1,2}|\d{2}/
//   );

//   const timeMatch = text.match(/\([^()]*\)/g);

//   let marketTime = "";

//   if (timeMatch && timeMatch.length > 0) {
//     marketTime = timeMatch[timeMatch.length - 1]
//       .replace(/\s+/g, " ")
//       .trim();
//   }

//   const hasChart = await checkChartAvailable(name);

//   if (hasChart) {
//     result.push({
//       marketName: name,
//       marketResult: resultMatch ? resultMatch[0] : "",
//       marketTime: marketTime,
//     });
//   }



//     };

//     console.log("TOTAL MARKETS:", result.length);

//     return result;

//   } catch (err) {

//     console.log("SCRAPER ERROR:", err.message);

//     return [];
//   }
// };


// const checkChartAvailable = async (marketName) => {

//   const cacheKey = `chart-${marketName}`;

//   const cached = cache.get(cacheKey);

//   if (cached !== undefined) {
//     return cached;
//   }

//   try {

//     const slug = marketName
//       .toLowerCase()
//       .replace(/\s+/g, "-");

//     const url = `https://sattamatkadpboss.co/record/${slug}-chart.php`;

//     const { data } = await axios.get(url);

//     const $ = cheerio.load(data);

//     const tables = $("table.chat7");

//     const hasChart = tables.length > 0;

//     cache.set(cacheKey, hasChart);

//     return hasChart;

//   } catch {

//     cache.set(cacheKey, false);

//     return false;

//   }

// };
// // ================= MATKA API =================
// app.get("/api/matka", async (req, res) => {
//   try {
//     let markets = await scrapeMarkets();

//     const controls = await MarketControl.find().lean();

//     const visibilityMap = {};
//     controls.forEach(c => {
//       visibilityMap[c.marketName] = c.isVisible;
//     });

//     const finalMarkets = markets.filter(m => {
//       if (visibilityMap[m.marketName] === undefined) return true;
//       return visibilityMap[m.marketName];
//     });

//     res.json({
//       success: true,
//       total: finalMarkets.length,
//       data: finalMarkets,
//     });

//   } catch (err) {
//     console.log("MATKA ERROR:", err.message);
//     res.json({ success: true, data: [] });
//   }
// });

// // ================= CHART API =================
// app.get("/api/chart/:market", async (req, res) => {

//   try {

//     const slug = req.params.market
//       .toLowerCase()
//       .replace(/\s+/g, "-");

//     const chartUrl = `https://sattamatkadpboss.co/record/${slug}-chart.php`;

//     const { data } = await axios.get(chartUrl, {
//       headers: {
//         "User-Agent":
//           "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
//       },
//       timeout: 8000
//     });

//     const $ = cheerio.load(data);

//     const tables = $("table.chat7");

//     if (!tables.length) {
//       return res.json({
//         success: true,
//         hasChart: false,
//         data: []
//       });
//     }

//     // 🔥 LAST TABLE (same logic as puppeteer)
//     const targetTable = tables.last();

//     const chartData = [];

//     targetTable.find("tr").each((i, row) => {

//       const cols = [];

//       $(row).find("td").each((j, col) => {
//         cols.push($(col).text().trim());
//       });

//       if (cols.length === 7) {
//         chartData.push(cols);
//       }

//     });

//     // ================= FORCE TODAY CELL LIKE DP BOSS =================

//     if (chartData.length > 0) {

//       const today = new Date().getDay();

//       const columnIndex = today === 0 ? 6 : today - 1;

//       const lastRowIndex = chartData.length - 1;

//       if (
//         chartData[lastRowIndex] &&
//         chartData[lastRowIndex][columnIndex]
//       ) {
//         chartData[lastRowIndex][columnIndex] = "**";
//       }

//     }

//     res.json({
//       success: true,
//       hasChart: true,
//       data: chartData
//     });

//   } catch (err) {

//     console.log("CHART ERROR:", err.message);

//     res.json({
//       success: true,
//       hasChart: false,
//       data: []
//     });

//   }

// });

// // ================= ADMIN MARKETS =================
// app.get("/api/admin/all-markets", async (req, res) => {
//   const markets = await scrapeMarkets();
//   res.json({ success: true, data: markets });
// });

// app.get("/api/admin/markets", async (req, res) => {
//   const controls = await MarketControl.find();
//   res.json({ success: true, data: controls });
// });

// app.post("/api/admin/markets/update", async (req, res) => {
//   try {
//     const { markets } = req.body;

//     for (let m of markets) {
//       await MarketControl.findOneAndUpdate(
//         { marketName: m.marketName },
//         { isVisible: m.isVisible },
//         { upsert: true }
//       );
//     }

//     res.json({ success: true });

//   } catch (err) {
//     res.json({ success: false });
//   }
// });

// // ================= LOGIN =================
// app.post("/api/admin/login", async (req, res) => {
//   const { username, password } = req.body;

//   const admin = await Admin.findOne({ username });
//   if (!admin) return res.status(400).json({ message: "Invalid" });

//   const isMatch = await bcrypt.compare(password, admin.password);
//   if (!isMatch) return res.status(400).json({ message: "Invalid" });

//   const token = jwt.sign(
//     { id: admin._id },
//     process.env.JWT_SECRET || "secret",
//     { expiresIn: "1d" }
//   );

//   res.json({ token });
// });

// // Create or Update Banner
// app.post(
//   "/api/admin/banner",
//   auth,
//   upload.fields([
//     { name: "desktop", maxCount: 1 },
//     { name: "tablet", maxCount: 1 },
//     { name: "mobile", maxCount: 1 }
//   ]),
//   async (req, res) => {
//     try {
//       const { title, buttons, desktopFocus, tabletFocus, mobileFocus } = req.body;

//       let banner = await Banner.findOne();

//       const makeUrl = (file) =>
//         `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;

//       const parsedButtons = buttons ? JSON.parse(buttons) : [];

//       const updateData = {
//         title,
//         buttons: parsedButtons
//       };

//       if (req.files.desktop) {
//         updateData.desktop = {
//           url: makeUrl(req.files.desktop[0]),
//           focus: desktopFocus || "center center"
//         };
//       }

//       if (req.files.tablet) {
//         updateData.tablet = {
//           url: makeUrl(req.files.tablet[0]),
//           focus: tabletFocus || "center center"
//         };
//       }

//       if (req.files.mobile) {
//         updateData.mobile = {
//           url: makeUrl(req.files.mobile[0]),
//           focus: mobileFocus || "center center"
//         };
//       }

//       if (banner) {
//         Object.assign(banner, updateData);
//         await banner.save();
//       } else {
//         banner = await Banner.create(updateData);
//       }

//       res.json({ success: true });

//     } catch (err) {
//       console.log(err);
//       res.status(500).json({ success: false, message: err.message });
//     }
//   }
// );

// app.get("/api/banner", async (req, res) => {
//   try {
//     const banner = await Banner.findOne();
//     res.json({ success: true, data: banner });
//   } catch (err) {
//     res.json({ success: false });
//   }
// });

// // ================= START =================
// const PORT = process.env.PORT || 8000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });































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

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const Banner = require("./models/Banner");
const auth = require("./middleware/auth");

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const cache = new NodeCache({ stdTTL: 300 });


// ================= MONGODB =================

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Connected ✅"))
.catch(err=>console.log("Mongo Error:",err));


// ================= IMAGE UPLOAD =================

const storage = multer.diskStorage({
destination:(req,file,cb)=>cb(null,"uploads/"),
filename:(req,file,cb)=>{
const unique = Date.now()+"-"+Math.round(Math.random()*1e9);
cb(null,unique+path.extname(file.originalname));
}
});

const upload = multer({storage});


// ================= BASIC ROUTE =================

app.get("/",(req,res)=>{
res.send("Backend Running 🚀");
});


// ================= SOCKET =================

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


// ================= SCRAPER =================

const scrapeMarkets = async()=>{

try{

const {data} = await axios.get(
"https://sattamatkadpboss.co",
{
headers:{
"User-Agent":
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
},
timeout:15000
}
);

const $ = cheerio.load(data);

const result=[];
const seen=new Set();

$(".news-body > div").each((i,el)=>{

const text=$(el).text().trim();
if(!text) return;

const lines=text.split("\n").map(l=>l.trim()).filter(Boolean);
if(!lines.length) return;

const name=lines[0].replace(/[{}]/g,"").trim();

if(
!name ||
seen.has(name) ||
name.toLowerCase()==="jodi" ||
name.toLowerCase()==="panel"
) return;

seen.add(name);

const resultMatch=text.match(
/\d{2,3}-\d{1,2}-\d{2,3}|\d{2,3}-\d{1,2}|\d{2}/
);

const timeMatch=text.match(/\([^()]*\)/g);

let marketTime="";

if(timeMatch && timeMatch.length>0){
marketTime=timeMatch[timeMatch.length-1]
.replace(/\s+/g," ")
.trim();
}

result.push({
marketName:name,
marketResult:resultMatch?resultMatch[0]:"",
marketTime:marketTime
});

});

console.log("TOTAL MARKETS:",result.length);

return result;

}catch(err){

console.log("SCRAPER ERROR:",err.message);
return [];

}

};


// ================= MATKA API =================

app.get("/api/matka",async(req,res)=>{

try{

let markets=await scrapeMarkets();

const controls=await MarketControl.find().lean();

const visibilityMap={};

controls.forEach(c=>{
visibilityMap[c.marketName]=c.isVisible;
});

const finalMarkets=markets.filter(m=>{
if(visibilityMap[m.marketName]===undefined) return true;
return visibilityMap[m.marketName];
});

res.json({
success:true,
total:finalMarkets.length,
data:finalMarkets
});

}catch(err){

console.log("MATKA ERROR:",err.message);
res.json({success:true,data:[]});

}

});


// ================= CHART API =================

app.get("/api/chart/:market",async(req,res)=>{

try{

const slug=req.params.market
.toLowerCase()
.replace(/\s+/g,"-");

const chartUrl=
`https://sattamatkadpboss.co/record/${slug}-chart.php`;

const {data}=await axios.get(chartUrl,{
headers:{
"User-Agent":
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
},
timeout:8000
});

const $=cheerio.load(data);

const tables=$("table.chat7");

if(!tables.length){

return res.json({
success:true,
hasChart:false,
data:[]
});

}

const targetTable=tables.last();

const chartData=[];

targetTable.find("tr").each((i,row)=>{

const cols=[];

$(row).find("td").each((j,col)=>{

const text=$(col).text().trim();

const match=text.match(/\b\d{2}\b/);

cols.push(match?match[0]:"");

});

if(cols.length===7){
chartData.push(cols);
}

});

res.json({
success:true,
hasChart:true,
data:chartData
});

}catch(err){

console.log("CHART ERROR:",err.message);

res.json({
success:true,
hasChart:false,
data:[]
});

}

});


// ================= ADMIN =================

app.get("/api/admin/all-markets",async(req,res)=>{
const markets=await scrapeMarkets();
res.json({success:true,data:markets});
});

app.get("/api/admin/markets",async(req,res)=>{
const controls=await MarketControl.find();
res.json({success:true,data:controls});
});

app.post("/api/admin/markets/update",async(req,res)=>{

try{

const {markets}=req.body;

for(let m of markets){

await MarketControl.findOneAndUpdate(
{marketName:m.marketName},
{isVisible:m.isVisible},
{upsert:true}
);

}

res.json({success:true});

}catch(err){

res.json({success:false});

}

});


// ================= LOGIN =================

app.post("/api/admin/login",async(req,res)=>{

const {username,password}=req.body;

const admin=await Admin.findOne({username});
if(!admin) return res.status(400).json({message:"Invalid"});

const isMatch=await bcrypt.compare(password,admin.password);
if(!isMatch) return res.status(400).json({message:"Invalid"});

const token=jwt.sign(
{id:admin._id},
process.env.JWT_SECRET||"secret",
{expiresIn:"1d"}
);

res.json({token});

});


// ================= BANNER =================

app.post(
"/api/admin/banner",
auth,
upload.fields([
{name:"desktop",maxCount:1},
{name:"tablet",maxCount:1},
{name:"mobile",maxCount:1}
]),
async(req,res)=>{

try{

const {title,buttons,desktopFocus,tabletFocus,mobileFocus}=req.body;

let banner=await Banner.findOne();

const makeUrl=file =>
`${req.protocol}://${req.get("host")}/uploads/${file.filename}`;

const parsedButtons=buttons?JSON.parse(buttons):[];

const updateData={
title,
buttons:parsedButtons
};

if(req.files.desktop){
updateData.desktop={
url:makeUrl(req.files.desktop[0]),
focus:desktopFocus||"center center"
};
}

if(req.files.tablet){
updateData.tablet={
url:makeUrl(req.files.tablet[0]),
focus:tabletFocus||"center center"
};
}

if(req.files.mobile){
updateData.mobile={
url:makeUrl(req.files.mobile[0]),
focus:mobileFocus||"center center"
};
}

if(banner){
Object.assign(banner,updateData);
await banner.save();
}else{
banner=await Banner.create(updateData);
}

res.json({success:true});

}catch(err){

console.log(err);
res.status(500).json({success:false,message:err.message});

}

});

app.get("/api/banner",async(req,res)=>{

try{

const banner=await Banner.findOne();

res.json({
success:true,
data:banner
});

}catch(err){

res.json({success:false});

}

});


// ================= START =================

const PORT=process.env.PORT||8000;

server.listen(PORT,()=>{
console.log(`Server running on port ${PORT}`);
});