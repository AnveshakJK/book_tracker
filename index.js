import pg from "pg"
import express from "express"
import bodyParser from "body-parser";
import dotenv from "dotenv";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

dotenv.config();

const db = new pg.Client({
  user:process.env.db_user,
  host: process.env.db_host,
  database: process.env.db_database,
  password: process.env.db_password,
  port: process.env.db_port,
});

db.connect();

let books=[{id: 1, title: "Can't Hurt Me", author: "David Goggins", rating: 5, review: "If you're someone who strives to master your mind, I highly recommend Can't Hurt Me as a case study in the measures one man took to master his own mind and achieve uncommon levels of excellence.", date_read: '2024-06-18', isbn: '9781544512273'}];

app.get("/", async (req,res)=>{
    let result = await db.query("SELECT * FROM library ORDER BY rating DESC");
    books = result.rows;
    res.render("index.ejs", {
        books: books,
    });
});

app.get("/admin-login", async (req,res)=>{
    res.render("admin_login.ejs");
});

app.post("/admin", async (req,res)=>{
    if (req.body.username == "Jayank@gmail.com" && req.body.password == "Jayank"){
        let result = await db.query("SELECT * FROM library ORDER BY date_read DESC");
        books = result.rows;
        res.render("admin.ejs", {
        books: books,
    });
    } else{
        res.redirect("/admin-login");
    }
});

app.get("/book/:id", async (req, res)=>{

    try{
        const result = await db.query("SELECT * FROM library WHERE id=$1", [parseInt(req.params.id)]);
        if (result.rows.length > 0){
            res.render("book.ejs", {
            book: result.rows[0],
         });
        } else{
            res.redirect("/");
        }
    } catch(err){
        console.log(err);
        res.redirect("/")
    }
});

app.get("/new", (req, res)=>{
    res.render("new.ejs", {
        act: "Add",
    });
});

app.get("/edit/:id", async (req, res)=>{
    try{
        const result = await db.query("SELECT * FROM library WHERE id=$1", [parseInt(req.params.id)]);
        if (result.rows.length > 0){
            res.render("new.ejs", {
                act: "Edit", 
                book: result.rows[0],
            });
        } else{
            res.redirect("/");
        }
    } catch(err){
        console.log(err);
        res.redirect("/");
    }   
});


app.get("/search", async (req, res) => {
    try {
        const searchQuery = req.query.query;

        if (!searchQuery) {
            return res.redirect("/");
        }

        const result = await db.query(
            "SELECT * FROM library WHERE LOWER(title) LIKE $1 OR LOWER(author) LIKE $2 ORDER BY rating DESC",
            [`%${searchQuery.toLowerCase()}%`, `%${searchQuery.toLowerCase()}%`]
        );

        res.render("index.ejs", {
            books: result.rows,
        });
    } catch (err) {
        console.error(err);
        res.redirect("/"); 
    }
});


app.get("/filter", async (req, res) => {
    try {
        const { author, rating, date_read } = req.query;

        let query = "SELECT * FROM library";
        let queryParams = [];
        let conditions = [];

        if (author) {
            conditions.push(`LOWER(author) LIKE $${conditions.length + 1}`);
            queryParams.push(`%${author.toLowerCase()}%`);
        }
        if (rating) {
            conditions.push(`rating = $${conditions.length + 1}`);
            queryParams.push(parseInt(rating));
        }
        if (date_read) {
            conditions.push(`date_read = $${conditions.length + 1}`);
            queryParams.push(date_read);
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY rating DESC"; 

        const result = await db.query(query, queryParams);

        res.render("index.ejs", {
            books: result.rows,
        });
    } catch (err) {
        console.log(err);
        res.redirect("/");
    }
});


app.post("/delete/:id", async (req, res)=>{
    try{
        const deleted_title = await db.query("DELETE FROM library WHERE id=$1 RETURNING title", [parseInt(req.params.id)]);
        console.log("Deleted: ", deleted_title.rows[0].title);
        let result = await db.query("SELECT * FROM library");
        books = result.rows;
        res.render("admin.ejs", {
            books: books,
        });
    } catch(err){
        console.log(err);
        res.render("admin.ejs", {
            books: books,
        });
    }
});

app.post("/add", async (req, res) => {
    console.log(req.body); 

    try {
       
        if (!req.body.title || !req.body.author || !req.body.rating || !req.body.review || !req.body.date_read || !req.body.isbn) {
            return res.status(400).send("All fields are required.");
        }

        const isbnCheck = await db.query("SELECT * FROM library WHERE isbn = $1", [req.body.isbn]);
        if (isbnCheck.rows.length > 0) {
            return res.status(400).send("A book with this ISBN already exists.");
        }

        await db.query(
            "INSERT INTO library (title, author, rating, review, date_read, isbn) VALUES ($1, $2, $3, $4, $5, $6)", 
            [
                req.body.title, 
                req.body.author, 
                parseInt(req.body.rating), 
                req.body.review, 
                req.body.date_read, 
                req.body.isbn
            ]
        );

        let result = await db.query("SELECT * FROM library");
        books = result.rows;

        res.render("admin.ejs", {
            books: books,
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Error adding the book.");
    }
});

app.post("/edit", async (req, res)=>{
    console.log(req.body);
    try{
        await db.query("UPDATE library SET (title, author, rating, review, date_read, isbn) = ($1, $2, $3, $4, $5, $6) WHERE id=$7", 
            [req.body.title, req.body.author, parseInt(req.body.rating), req.body.review, req.body.date_read, req.body.isbn, parseInt(req.body.id)]);
        let result = await db.query("SELECT * FROM library");
        books = result.rows;
        res.render("admin.ejs", {
            books: books,
        });
    } catch(err){
        console.log(err);
        res.render("admin.ejs", {
            books: books,
        });
    }

});

app.listen(port, ()=>{
    console.log(`Server running on http://localhost:${port}`);
});
    
