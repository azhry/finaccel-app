import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import ax from 'axios';
import io from 'socket.io-client';

const API_URL = `http://localhost:3000`;
const axios = ax.create({
  baseURL: API_URL
});

const App = () => {

  const [salaryData, setSalaryData] = useState({});
  const [ageData, setAgeData] = useState({});
  const [progress, setProgress] = useState(0);
  const [queue, setQueue] = useState('');

  const setupSocketClient = () => {
    const socket = io(API_URL);
    socket.on('connect', () => console.log('you are connected'));
    socket.on('disconnect', () => console.log('you are disconnected'));
    
    socket.on('queue', queueTitle => setQueue(queueTitle));
    socket.on('progress', numEmployeesProcessed => {
      setProgress(numEmployeesProcessed);
    });
  };

  const fetchChartsData = () => {
    Promise.all([
      axios.get(`/employees/avg-salaries`),
      axios.get(`/employees/avg-ages`)
    ])
    .then(response => {
      console.log(response);
      if (response[0].status === 200) {
        const responseData = response[0].data;
        const labels = responseData.map(x => x.title);
        const values = responseData.map(x => x.avg_salary);
        setSalaryData({
          labels,
          datasets: [
            {
              label: 'Average Salary Per Job Title',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 1,
              hoverBackgroundColor: 'rgba(255, 99, 132, 0.4)',
              hoverBorderColor: 'rgba(255, 99, 132, 1)',
              data: values
            }
          ]
        });
      }
      if (response[1].status === 200) {
        const responseData = response[1].data;
        const labels = responseData.map(x => x.title);
        const values = responseData.map(x => x.avg_age);
        setAgeData({
          labels,
          datasets: [
            {
              label: 'Average Age Per Job Title',
              backgroundColor: 'rgba(0, 99, 132, 0.2)',
              borderColor: 'rgba(0, 99, 132, 1)',
              borderWidth: 1,
              hoverBackgroundColor: 'rgba(0, 99, 132, 0.4)',
              hoverBorderColor: 'rgba(0, 99, 132, 1)',
              data: values
            }
          ]
        });
      }
    })
    .catch(error => {
      console.log(error);
    });
  };

  const generateAbsenceData = () => {
    axios.get(`/queues/enqueue`)
      .then(response => {
        if (response.status === 200) {
          axios.get(`/queues/process`)
            .then(response => {
              console.log(response);
            })
            .catch(error => console.log(error));
        }
      })
      .catch(error => console.log(error));
  };

  useEffect(() => {
    setupSocketClient();
    fetchChartsData();
  }, []);

  return (
    <div style={{ display: 'flex' }}>
      <div style={{
        width: 500,
        margin: 10
      }}>
        <Bar
          width={500}
          height={200}
          data={salaryData}/>
        <Bar
          width={500}
          height={200}
          data={ageData}/>
      </div>
      <div>
        <button onClick={generateAbsenceData}>Generate Absence Data</button>
        <div>Queue: {queue}</div>
        <div>Status: {progress}</div>
      </div>
    </div>
    
  );
};

export default App;