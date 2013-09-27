console.log("Executing appABC " + process.pid);

process.argv.forEach(function (val, idx, arr) {
    console.log(idx + ": " + val);
});
