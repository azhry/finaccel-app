const mariadb = require('mariadb');
const Stream = require('stream');
const {
    getRandomInt,
    getStartDate,
    getEndDate
} = require('../helpers');

const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    connectionLimit: 5
});

const leaveTypes = ['Annual', 'Maternity', 'Sick', 'Unpaid'];

module.exports = async function employeesStream(cb, processCb = () => {}) {
    let conn;
    try {
        conn = await pool.getConnection();

        const queryStream = await conn.queryStream('SELECT emp_no, hire_date, gender FROM employees.employees');

        let numEmployeesProcessed = 0;
        const transformStream = new Stream.Transform({
            objectMode: true,
            transform: async function transformer(chunk, encoding, callback) {
                const hasLeave = !!getRandomInt(0, 1);

                if (hasLeave) {
                    let batch = [];
                    let monthlyAnnualLeavesFlag = {};
                    for (let i = 0; i < 90; i++) {
                        const todayLeave = !!getRandomInt(0, 1);
                        if (todayLeave) {
                            const startDate = getStartDate(chunk.hire_date, i, 7, 11);
                            const endDate = getEndDate(chunk.hire_date, i);
                            const selectedLeaveType = leaveTypes[getRandomInt(0, 3)];
                            switch (selectedLeaveType) {
                                case 'Annual':
                                    const month = startDate.getMonth();
                                    if (!monthlyAnnualLeavesFlag[month]) {
                                        monthlyAnnualLeavesFlag[month] = true;
                                        batch.push([chunk.emp_no, startDate, endDate, selectedLeaveType]);
                                    }
                                    break;
        
                                case 'Maternity':
                                    if (chunk.gender === 'F') {
                                        batch.push([chunk.emp_no, startDate, endDate, selectedLeaveType]);
                                    }
                                    break;
        
                                default:
                                    batch.push([chunk.emp_no, startDate, endDate, selectedLeaveType]);
                                    break;
                            }
                        }
                    }
    
                    conn.beginTransaction();
                    try {
                        await conn.batch('INSERT INTO employees.daily_employee_leaves(emp_no, start_date, end_date, type) VALUES(?, ?, ?, ?)', batch);
                        conn.commit();
                    }
                    catch (err) {
                        conn.rollback();
                        console.log(error);
                    }
                }

                numEmployeesProcessed++;
                if (numEmployeesProcessed % 100) {
                    processCb(numEmployeesProcessed);
                }
                callback();
            },
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
};