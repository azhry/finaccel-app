const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getStartDate = (date, i, start = 8, end = 11) => {
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() + (i + 1));
    startDate.setHours(
        getRandomInt(start, end),
        getRandomInt(0, 59),
        getRandomInt(0, 59)
    );
    return startDate;
};

const getEndDate = (date, i) => {
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + (i + 1));
    endDate.setHours(
        getRandomInt(17, 20),
        getRandomInt(0, 59),
        getRandomInt(0, 59)
    );
    return endDate;
};

module.exports = {
    getRandomInt,
    getStartDate,
    getEndDate
};