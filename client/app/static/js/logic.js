Moralis.start({ serverUrl: "http://localhost:1337/server", appId: "001" });

const nft_contract_address = "0x0Fb6EF3505b9c52Ed39595433a21aF9B5FCc4431"; //NFT Minting Contract Use This One "Batteries Included", code of this contract is in the github repository under contract_base for your reference.
/*
Available deployed contracts
Ethereum Rinkeby 0x0Fb6EF3505b9c52Ed39595433a21aF9B5FCc4431
Polygon Mumbai 0x351bbee7C6E9268A1BF741B098448477E08A0a53
BSC Testnet 0x88624DD1c725C6A95E223170fa99ddB22E1C6DDD
*/

const web3 = new Web3(window.ethereum);

//frontend logic

async function login() {
  await Moralis.enableWeb3({ throwOnError: true, provider: "metamask" });

  const { account, chainId } = Moralis;

  if (!account) {
    throw new Error(
      "Connecting to chain failed, as no connected account was found"
    );
  }
  if (!chainId) {
    throw new Error(
      "Connecting to chain failed, as no connected chain was found"
    );
  }

  // Get message to sign from the auth api
  const { message } = await Moralis.Cloud.run("requestMessage", {
    address: account,
    chain: parseInt(chainId, 16),
    network: "evm",
  });

  // Authenticate and login via parse
  await Moralis.Web3.authenticate({
    signingMessage: message,
    throwOnError: true,
  })
    .then(function (user) {
      user.set("name", document.getElementById("username").value);
      user.set("email", document.getElementById("useremail").value);
      user.save();
      document.getElementById("upload").removeAttribute("disabled");
      document.getElementById("file").removeAttribute("disabled");
      document.getElementById("name").removeAttribute("disabled");
      document.getElementById("description").removeAttribute("disabled");
    })
    .catch((error) => {
      console.log(error);
    });
}

const convertBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);

    fileReader.onload = () => {
      resolve(fileReader.result);
    };

    fileReader.onerror = (error) => {
      reject(error);
    };
  });
};

async function upload() {
  const fileInput = document.getElementById("file");
  const data = fileInput.files[0];
  const imageFile = new Moralis.File(data.name, data);

  const uploadArray = [
    {
      path: data.name,
      content: await convertBase64(data),
    },
  ];

  const response = await Moralis.Web3API.storage.uploadFolder({
    abi: uploadArray,
  });
  document.getElementById("upload").setAttribute("disabled", null);
  document.getElementById("file").setAttribute("disabled", null);
  document.getElementById("name").setAttribute("disabled", null);
  document.getElementById("description").setAttribute("disabled", null);

  const imageURI = response[0].path;
  const metadata = {
    name: document.getElementById("name").value,
    description: document.getElementById("description").value,
    image: imageURI,
  };
  const metadataResponse = await Moralis.Web3API.storage.uploadFolder({
    abi: [
      {
        path: "metadata.json",
        content: btoa(JSON.stringify(metadata)),
      },
    ],
  });
  const metadataURI = metadataResponse[0].path;
  const txt = await mintToken(metadataURI).then(notify);
}

async function mintToken(_uri) {
  const encodedFunction = web3.eth.abi.encodeFunctionCall(
    {
      name: "mintToken",
      type: "function",
      inputs: [
        {
          type: "string",
          name: "tokenURI",
        },
      ],
    },
    [_uri]
  );

  const transactionParameters = {
    to: nft_contract_address,
    from: ethereum.selectedAddress,
    data: encodedFunction,
  };
  const txt = await ethereum.request({
    method: "eth_sendTransaction",
    params: [transactionParameters],
  });
  return txt;
}

async function notify(_txt) {
  document.getElementById(
    "resultSpace"
  ).innerHTML = `<input disabled = "true" id="result" type="text" class="form-control" placeholder="Description" aria-label="URL" aria-describedby="basic-addon1" value="Your NFT was minted in transaction ${_txt}">`;
}
