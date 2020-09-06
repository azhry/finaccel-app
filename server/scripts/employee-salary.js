const mariadb = require('mariadb');
const Stream = require('stream');

const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    connectionLimit: 5
});

const getBreakTimeSalaryIncrement = avgBreakTime => {
    if (avgBreakTime > 60) {
        return -1.0;
    }
    return 1.5;
};
const getWorkingHoursSalaryIncrement = avgWorkingHours => {
    if (avgWorkingHours > 10) return 5.0;

    if (avgWorkingHours < 8) return 2.5;

    if (avgWorkingHours < 7) return 0.5;
    
    return 0.0;
};
const getJobTitleSalaryIncrement = jobTitle => {
    switch (jobTitle) {
        case 'staff':
            return 1.0;

        case 'senior engineer':
            return 3.0;

        case 'engineer':
            return 2.0;

        case 'assistant engineer':
            return 2.5;

        case 'technical leader':
            return 4.0;
    }
    return 0.0;
};
const percentageIncrementTitles = ['staff', 'senior engineer', 'engineer', 'assistant engineer', 'technical leader'];

module.exports = async function employeesStream(cb, processCb = () => {}) {
    let conn, conn2;
    try {
        conn = await pool.getConnection();
        conn2 = await pool.getConnection();

        const queryStream = await conn.queryStream(`
            SELECT 
                A.emp_no,
                B.title,
                (
                    SELECT 
                        AVG(
                            CASE
                                WHEN DATE(C.start_date) IN (
                                    SELECT DATE(start_date)
                                    FROM employees.daily_employee_leaves D
                                    WHERE D.emp_no = C.emp_no
                                    AND D.type = 'Unpaid'
                                ) THEN 0
                                ELSE (TIMESTAMPDIFF(second, C.start_date, C.end_date) / 3600)
                            END
                        ) AS avg_working_hours
                    FROM employees.daily_employee_absences C
                    WHERE C.emp_no = A.emp_no
                ) AS avg_working_hours,
                (
                    SELECT 
                        AVG(break_time) AS avg_break_time
                    FROM employees.daily_employee_absences C
                    WHERE C.emp_no = A.emp_no
                ) AS avg_break_time
            FROM employees.employees A
            LEFT JOIN employees.titles B 
            ON A.emp_no = B.emp_no
        `);

        let numEmployeesProcessed = 0;
        const transformStream = new Stream.Transform({
            objectMode: true,
            transform: async function transformer(chunk, encoding, callback) {
                let defaultTitleSalaryIncrement = 0;
                let percentageSalaryIncrement = 0;

                if (percentageIncrementTitles.indexOf(chunk.title.toLowerCase()) === -1) {
                    defaultTitleSalaryIncrement = 1000;
                }
                else {
                    percentageSalaryIncrement += getJobTitleSalaryIncrement(chunk.title.toLowerCase());
                }

                percentageSalaryIncrement += getWorkingHoursSalaryIncrement(chunk.avg_working_hours);
                percentageSalaryIncrement += getBreakTimeSalaryIncrement(chunk.avg_break_time);

                await conn2.query(`
                    UPDATE employees.salaries 
                    SET salary = (
                        CASE
                            WHEN ((salary + ((${percentageSalaryIncrement} / 100) * salary)) - salary + ${defaultTitleSalaryIncrement}) > 2000 
                                THEN salary + 2000
                            ELSE (salary + ((${percentageSalaryIncrement} / 100) * salary) + ${defaultTitleSalaryIncrement})
                        END
                    )
                    WHERE emp_no = ${chunk.emp_no}
                `);
                

                numEmployeesProcessed++;
                if (chunk.emp_no % 100 == 0) {
                    processCb(numEmployeesProcessed);
                }

                callback();
            }
        });

        Stream.pipeline(
            queryStream,
            transformStream,
            err => cb(err));

    } catch (err) {
        throw err;
    } finally {
        if (conn) {
            conn.end();
        };
    }
}