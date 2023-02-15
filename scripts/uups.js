const { ethers,upgrades } = require("hardhat");
let address;
async function uups1() {
    const UUPS1 = await ethers.getContractFactory("UUPS1");
    const uups = await upgrades.deployProxy(UUPS1);
    const u = await uups.deployed();
    
    // 逻辑合约
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(u.address);
    const adminAddress = await upgrades.erc1967.getAdminAddress(u.address);
    console.log("逻辑合约：",implementationAddress)
    console.log("管理员合约：",adminAddress);
    console.log("代理合约：",u.address);
    console.log(u.functions);
    console.log(await u.value());
    await u.add();
    console.log(await u.value());
    address = u.address;
    console.log("-------------------------------------------")
}

const uups2 = async () => {
    const UUPS = await ethers.getContractFactory("UUPS2");
    const uups = await upgrades.upgradeProxy(
        address,
        UUPS,
        {
            kind: "uups",
            initializer:"initializer",
        }
    );

    const implementationAddress = await upgrades.erc1967.getImplementationAddress(uups.address);
    const adminAddress = await upgrades.erc1967.getAdminAddress(uups.address);
    console.log("逻辑合约：",implementationAddress)
    console.log("管理员合约：",adminAddress);
    console.log("代理合约：",uups.address);
    console.log(await uups.value());
    console.log(uups.functions);
}



uups1();


setTimeout(async ()=>{
    uups2()
},5000)