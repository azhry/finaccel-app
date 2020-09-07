const express = require('express');
const router = express.Router();
const mariadb = require('mariadb');
const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    connectionLimit: 5
});

router.get('/avg-salaries', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const response = await conn.query(`
            SELECT AVG(A.salary) AS avg_salary, C.title
            FROM employees.salaries A
            JOIN (
                SELECT emp_no, salary, MAX(to_date) AS to_date
                FROM employees.salaries 
                GROUP BY emp_no    
            ) B
            ON A.emp_no = B.emp_no 
            AND A.to_date = B.to_date
            JOIN employees.titles C 
            ON A.emp_no = C.emp_no
            GROUP BY C.title
        `);
        conn.end();
        res.send(response);
    }
    catch (err) {
        console.log(err);
        if (conn) {
            conn.end();
        }
        res.send(err);
    }
});

router.get('/avg-ages', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const response = await conn.query(`
            SELECT B.title, AVG(TIMESTAMPDIFF(year, A.birth_date, NOW())) AS avg_age
            FROM employees.employees A
            JOIN employees.titles B 
            ON A.emp_no = B.emp_no
            GROUP BY B.title
        `);
        conn.end();
        res.send(response);
    }
    catch (err) {
        if (conn) {
            conn.end();
        }
        res.send(err);
    }
});

router.get('/avg-age', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const response = await conn.query(`
            SELECT emp_no, birth_date, AVG(TIMESTAMPDIFF(year, birth_date, NOW())) AS avg_age
            FROM employees.employees
        `);
        conn.end();
        res.send(response);
    }
    catch (err) {
        if (conn) {
            conn.end();
        }
        res.send(err);
    }
});

module.exports = router;
