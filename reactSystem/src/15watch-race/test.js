const a = async () => {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log(113);
            resolve("13324");
        }, 1000);
    });
};

console.log(1);
await a();
console.log(1);
console.log(1);
