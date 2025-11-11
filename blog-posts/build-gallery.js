document.addEventListener('DOMContentLoaded', function () {
    const galleryContainer = document.getElementById('gallery');
    const imageFolderPath = '../images/pics/'; // Your image folder

    allImages.forEach((imageName) => {
        // 1. Create the <img> element
        const img = document.createElement('img');
        img.src = imageFolderPath + imageName;

        // 2. Create the <div> wrapper
        const gridItem = document.createElement('div');
        gridItem.className = 'grid-item'; // For the 'break-inside' rule

        // 3. Put the <img> inside the <div>
        gridItem.appendChild(img);

        // 4. Add the <div> to the gallery
        galleryContainer.appendChild(gridItem);
    });
});
