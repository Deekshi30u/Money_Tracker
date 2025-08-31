import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";

const app = express();
const saltRounds=10;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = new pg.Client({
    user:"postgres",
    host:"localhost",
    database:"Moneytracker",
    port:5432,
    password:"Deekshi@30"
});

db.connect();

app.get("/",(req,res)=>{
    res.render("home.ejs");
});

app.get("/register",(req,res)=>{
    res.render("register.ejs");
});

app.get("/login",(req,res)=>{
    res.render("login.ejs");
});

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;
  const fname = req.body.firstname;
  const lname = req.body.lastname;
  const address = req.body.address;
  const dob = req.body.date;
  const city = req.body.city;
  const phnor = req.body.phone;

  try {
    const checkresult = await db.query("select * from users where email = $1", [email]);
    if (checkresult.rows.length > 0) {
      res.send("Email already present, try to login.");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.log("Error in hashing password", err);
        } else {
          console.log("Hashing pwd is", hash);
          await db.query(
            "insert into users(email, password, firstname, lastname, address, dob, city, phone) values ($1, $2, $3, $4, $5, $6, $7, $8)",
            [email, hash, fname, lname, address, dob, city, phnor]
          );

          const expenses = await db.query(`
            SELECT category, SUM(amount) AS total
            FROM expense
            GROUP BY category
          `);
          const chartData = expenses.rows;

          res.render("main.ejs", { yourdata: chartData });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});


app.post("/login", async (req, res) => {
  const Email = req.body.useremail;
  const lnpwd = req.body.userpassword;

  try {
    const result = await db.query("SELECT * FROM users WHERE email=$1", [Email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const display = user.password;
      const username = user.firstname;

      bcrypt.compare(lnpwd, display, async (err, isMatch) => {
        if (err) {
          console.error(err);
        } else {
          if (isMatch) {
            const expenses = await db.query(`
              SELECT category, SUM(amount) AS total
              FROM expense
              GROUP BY category
            `);
            const chartData = expenses.rows;

            res.render("main.ejs", { yourdata: chartData, name: username });
          } else {
            res.send("Incorrect Password");
          }
        }
      });
    } else {
      res.send("User not found");
    }
  } catch (err) {
    console.log(err);
  }
});


app.get("/addexpense",(req,res)=>{
    res.render("addexpense.ejs");
})

app.post("/addexpense", async(req,res)=>{
    const newAmount = req.body.number;
    const newCategory = req.body.category;
    const newDate = req.body.date;
    const newDescription = req.body.Description;

    console.log("Form data received:", newAmount, newCategory, newDate, newDescription);

    try {
        await db.query(
            "INSERT INTO expense (amount, category, expdate, description) VALUES ($1, $2, $3, $4)",
            [newAmount, newCategory, newDate, newDescription]
        );
        console.log("Data inserted successfully");
        res.redirect("/views");
    } catch (err) {
        console.log("Error inserting data:", err);
        res.send("Database error");
    }
});

app.get("/views", async(req,res)=>{
    try{
        const data = await db.query("Select * from expense");
        res.render("views.ejs", {
            list: data.rows,
            title:"DATA HISTORY"
        });
    }
    catch(err) {
        console.log(err);
    }
});

app.post("/delete-expense",async(req,res)=>{
    const id = req.body.id;
    await db.query("DELETE FROM EXPENSE where id = $1",[id]);
    res.redirect("/views");
})

app.post("/filter", async (req, res) => {
  const selectedCategory = req.body.category;
  try {
    const result = await db.query("SELECT * FROM expense WHERE category = $1", [selectedCategory]);
    res.render("views.ejs", {
      list: result.rows,
      title: `Expenses - ${selectedCategory}`
    });
  } catch (err) {
    console.log("Error filtering data:", err);
    res.send("Error retrieving filtered data.");
  }
});


app.post("/summary", async (req, res) => {
  const selectedMonth = req.body.month; 
  const selectedCategory = req.body.category;

  const startDate = `${selectedMonth}-01`;

  try {
    const result = await db.query(
  `SELECT SUM(amount) AS total
   FROM expense
   WHERE category = $1
   AND expdate >= $2
   AND expdate <= (date_trunc('month', $2::date) + interval '1 month - 1 day')`,
  [selectedCategory, startDate]
);


    const totalAmount = result.rows[0].total || 0;

    /*res.render("summary.ejs", {
      category: selectedCategory,
      month: selectedMonth,
      total: totalAmount
    });*/

    if(totalAmount)
    {
        res.render("summary.ejs",{
            category: selectedCategory,
            month: selectedMonth,
            total: totalAmount
        });
    }
    else{
        const totalAmount = 0;
         res.render("summary.ejs",{
        category: selectedCategory,
        month: selectedMonth,
        total: totalAmount
        });
    }
  } catch (err) {
    console.log("Error fetching summary:", err);
    res.send("Error fetching summary data.");
  }
});

app.get("/main", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT category, SUM(amount) AS total
      FROM expense
      GROUP BY category
    `);
    const chartData = result.rows;
    console.log("Fetched data for chart:", chartData);
    res.render("main.ejs", { yourdata: chartData });
  } catch (err) {
    console.error('Error fetching chart data:', err);
    res.status(500).send('Server Error');
  }
});






const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
