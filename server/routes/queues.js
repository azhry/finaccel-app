const express = require('express');
const router = express.Router();
const kue = require('kue');
const queue = kue.createQueue();

const generateEmployeeAbsences = require('../scripts/employee-absence');
const generateEmployeeLeaves = require('../scripts/employee-leaves');
const updateEmployeeSalaries = require('../scripts/employee-salary');

// https://stackoverflow.com/questions/37559610/socket-io-emit-on-express-route

router.get('/enqueue', (req, res) => {
    queue
        .create('employee-absences', { title: 'Generate Employee Absences' })
        .save();

    queue
        .create('employee-leaves', { title: 'Generate Employee Leaves' })
        .save();

    queue
        .create('employee-salary', { title: 'Update Employee Salaries' })
        .save();

    res.send('Queues generated');
});

router.get('/process', (req, res) => {
    queue.process('employee-absences', (job, done) => {
        req.app.io.emit('queue', job.data.title);
        generateEmployeeAbsences(err => {
            if (err) {
                console.log(err);
                done(err);
            }
            else {
                done();
                queue.process('employee-leaves', (job, done) => {
                    req.app.io.emit('queue', job.data.title);
                    generateEmployeeLeaves(err => {
                        if (err) {
                            console.log(err);
                            done(err);
                        }
                        else {
                            done();
                            queue.process('employee-salary', (job, done) => {
                                req.app.io.emit('queue', job.data.title);
                                updateEmployeeSalaries(err => {
                                    if (err) {
                                        console.log(err);
                                        done(err);
                                    }
                                    else {
                                        done();
                                        return 'success';
                                    }
                                }, numEmployeesProcessed => {
                                    req.app.io.emit('progress', numEmployeesProcessed);
                                });
                            });
                        }
                    }, numEmployeesProcessed => {
                        req.app.io.emit('progress', numEmployeesProcessed);
                    })
                });
            }
        }, numEmployeesProcessed => {
            req.app.io.emit('progress', numEmployeesProcessed);
        });
    });
    res.send('Processing queues');
});

router.get('/process-absences', (req, res) => {
    res.send('Processing absences queue');
});

router.get('/process-leaves', (req, res) => {
    res.send('Processing leaves queue');
});

router.get('/process-salaries', (req, res) => {
    res.send('Processing salaries queue');
});

router.use('/kue-api/', kue.app);

module.exports = router;