const { ethers,upgrades } = require("hardhat");
let address;
async function demo1() {
    const Demo = await ethers.getContractFactory("Demo1");
    const demo = await upgrades.deployProxy(Demo);
    const c = await demo.deployed();
    
    // 逻辑合约
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(c.address);
    const adminAddress = await upgrades.erc1967.getAdminAddress(c.address);
    console.log("逻辑合约：",implementationAddress)
    console.log("管理员合约：",adminAddress);
    console.log("代理合约：",c.address);
    console.log(c.functions);
    console.log(await c.value());
    await c.add(1);
    console.log(await c.value());
    address = c.address;
    console.log("-------------------------------------------")
}

const demo2 = async () => {
    const Demo = await ethers.getContractFactory("Demo2");
    const demo = await upgrades.upgradeProxy(address,Demo);

    const implementationAddress = await upgrades.erc1967.getImplementationAddress(demo.address);
    const adminAddress = await upgrades.erc1967.getAdminAddress(demo.address);
    console.log("逻辑合约：",implementationAddress)
    console.log("管理员合约：",adminAddress);
    console.log("代理合约：",demo.address);
    console.log(await demo.value());
    console.log(demo.functions);
}



demo1();


setTimeout(async ()=>{
    demo2()
},5000)