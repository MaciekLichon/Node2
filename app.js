const Jimp = require('jimp');
const inquirer = require('inquirer');
const fs = require('fs');


// DODAWANIE WATERMARKA TEKSTOWEGO

const addTextWatermarkToImage = async function(inputFile, outputFile, text) {
  try {
    // await zapewnia, ze kompilacja nie pojdzie dalej dopoki dany krok nie bedzie spelniony
    const image = await Jimp.read(inputFile); // laduje plik graficzny
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK); // wybiera czcionke

    const textData = {
      text,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
    };

    image.print(font, 0, 0, textData, image.getWidth(), image.getHeight()); // ustalenie czcionki, pozycji i tekstu. Aby alignment dzialal, trzeba odniesc sie do width i height obrazka
    await image.quality(100).writeAsync(outputFile); // zapisanie obrazka jako nowy plik

    console.log('Success! Watermark has just been added.');
    startApp();
  }
  catch (error) {
    console.log('Something went wrong... Try again.');
  }
};

// DODAWANIE WATERMARKA OBRAZKOWEGO

const addImageWatermarkToImage = async function(inputFile, outputFile, watermarkFile) {
  try {
    const image = await Jimp.read(inputFile); //laduje plik graficzny
    const watermark = await Jimp.read(watermarkFile); // laduje obrazek watermarka

    const x = image.getWidth() / 2 - watermark.getWidth() / 2;
    const y = image.getHeight() / 2 - watermark.getHeight() / 2; // przy obrazkach nie ma mozliwosci wyrownania automatycznego wiec trzeba obliczyc srodek samemu

    image.composite(watermark, x, y, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 0.5,
    }); // polaczenie watermarka z obrazkiem tak, aby watermark byl na wierzchu i mial mniejsze opacity

    await image.quality(100).writeAsync(outputFile);

    console.log('Success! Watermark has just been added.');
    startApp();
  }
  catch (error) {
    console.log('Something went wrong... Try again.');
  }
};

// PRZYGOTOWANIE NAZWY PLIKU WYJSCIOWEGO

const prepareOutputFilename = fileName => {
  const [name, ext] = fileName.split(".");
  return (
    `${name}-with-watermark.${ext}`
  );
};

// SPRAWDZENIE CZY ISTNIEJE TYMCZASOWY EDYTOWANY PLIK

const checkIfEditedExists = file => {
  if (fs.existsSync(`./img/edited-${file}`)) {
    return `./img/edited-${file}`;
  } else {
    return `./img/${file}`;
  }
}

// FUNCKJE EDYCJI

const changeBrightness = async function(inputFile, outputFile) {
  const image = await Jimp.read(inputFile); //laduje plik graficzny
  image.brightness(0.4);
  await image.quality(100).writeAsync(outputFile);
};

const changeContrast = async function(inputFile, outputFile) {
  const image = await Jimp.read(inputFile); //laduje plik graficzny
  image.contrast(0.5);
  await image.quality(100).writeAsync(outputFile);
};

const turnBlackAndWhite = async function(inputFile, outputFile) {
  const image = await Jimp.read(inputFile); //laduje plik graficzny
  image.greyscale();
  await image.quality(100).writeAsync(outputFile);
};

const invertImage = async function(inputFile, outputFile) {
  const image = await Jimp.read(inputFile); //laduje plik graficzny
  image.invert();
  await image.quality(100).writeAsync(outputFile);
};


// ------------- FUNKCJONALNOSC -------------

const startApp = async () => {

  // Ask if user is ready
  const startAnswer = await inquirer.prompt([{
    name: 'start',
    message: 'Hi! Welcome to "Watermark manager". Copy your image files to `/img` folder. Then you\'ll be able to use them in the app. Are you ready?',
    type: 'confirm'
  }]);

  // if answer is no, just quit the app
  if(!startAnswer.start) process.exit();

  // ask about input file and watermark type
  const imageSelect = await inquirer.prompt([{
    name: 'inputImage',
    type: 'input',
    message: 'What file do you want to mark?',
    default: 'test.jpg',
  }]);

  // if the file exists
  if (fs.existsSync(`./img/${imageSelect.inputImage}`)) {

    const editAnswer = await inquirer.prompt([{
      name: 'edit',
      message: 'Do you want to edit the image?',
      type: 'confirm'
    }]);

    if (editAnswer.edit) {

      const editSelect = await inquirer.prompt([{
        name: 'editOption',
        type: 'list',
        choices: ['Make image brighter', 'Increase contrast', 'Make image b&w', 'Invert image'],
      }]);

      // po edytowaniu plik zapisany jest jako 'edited-*' i dlatego pozniej sprawdzane jest czy taki plik w ogole istnieje
      if (editSelect.editOption === 'Make image brighter') {
        changeBrightness('./img/' + imageSelect.inputImage, './img/edited-' + imageSelect.inputImage);
      } else if (editSelect.editOption === 'Increase contrast') {
        changeContrast('./img/' + imageSelect.inputImage, './img/edited-' + imageSelect.inputImage);
      } else if (editSelect.editOption === 'Make image b&w') {
        turnBlackAndWhite('./img/' + imageSelect.inputImage, './img/edited-' + imageSelect.inputImage);
      } else if (editSelect.editOption === 'Invert image') {
        invertImage('./img/' + imageSelect.inputImage, './img/edited-' + imageSelect.inputImage);
      }
    }

    const watermarkSelect = await inquirer.prompt([{
      name: 'watermarkType',
      type: 'list',
      choices: ['Text watermark', 'Image watermark'],
    }]);

    if (watermarkSelect.watermarkType === 'Text watermark') {
      const text = await inquirer.prompt([{
        name: 'value',
        type: 'input',
        message: 'Type your watermark text:',
      }]);
      watermarkSelect.watermarkText = text.value;

      const fileName = prepareOutputFilename(imageSelect.inputImage);
      // jezli edited-* istnieje to on dostanie watermark, a jak nie istnieje to dostanie go oryginal
      addTextWatermarkToImage(checkIfEditedExists(imageSelect.inputImage), fileName, watermarkSelect.watermarkText);
    } else {
      const image = await inquirer.prompt([{
        name: 'filename',
        type: 'input',
        message: 'Type your watermark name:',
        default: 'logo.png',
      }]);
      watermarkSelect.watermarkImage = image.filename;

      if (fs.existsSync(`./img/${watermarkSelect.watermarkImage}`)) {
        const fileName = prepareOutputFilename(imageSelect.inputImage);
        addImageWatermarkToImage(checkIfEditedExists(imageSelect.inputImage), fileName, './img/' + watermarkSelect.watermarkImage);
      } else {
        console.log('Something went wrong... Try again.');
      }
    }

  } else {
    console.log('Something went wrong... Try again.');
  }

  // edited-* jest usuwany, zeby nie stwarzal problemow przy kolejnej petli
  if (fs.existsSync(`./img/edited-${imageSelect.inputImage}`)) {
    fs.unlinkSync(`./img/edited-${imageSelect.inputImage}`);
  }
}

startApp();
