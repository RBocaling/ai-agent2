export const randomizedMin = (min = 1, max = 3) => {
  setInterval(() => {
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`*/${randomNumber} * * * *`);
  }, 1000);
};

export const getRandomDelay = () => {
  return Math.floor(Math.random() * (1200000 - 600000 + 1)) + 600000;
};
