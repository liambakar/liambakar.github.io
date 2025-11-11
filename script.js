// Get all the necessary elements from the DOM
const carouselSlide = document.querySelector('.carousel-slide');
const carouselImages = document.querySelectorAll('.carousel-slide img');
const prevBtn = document.querySelector('#prevBtn');
const nextBtn = document.querySelector('#nextBtn');

// Counter to keep track of the current slide
let currentIndex = 0;
const slideWidth = carouselImages[0].clientWidth; // Get the width of one slide

// Function to move to a specific slide
function goToSlide(index) {
    // Move the entire slide "track"
    carouselSlide.style.transform = 'translateX(' + -slideWidth * index + 'px)';
}

// Event listener for the "Next" button
nextBtn.addEventListener('click', () => {
    // Move to the next index
    currentIndex++;

    // If at the last slide, loop back to the first
    if (currentIndex >= carouselImages.length) {
        currentIndex = 0;
    }

    goToSlide(currentIndex);
});

// Event listener for the "Previous" button
prevBtn.addEventListener('click', () => {
    // Move to the previous index
    currentIndex--;

    // If at the first slide, loop to the last
    if (currentIndex < 0) {
        currentIndex = carouselImages.length - 1;
    }

    goToSlide(currentIndex);
});

// Initialize to the first slide
goToSlide(0);

// Optional: If the window resizes, we need to recalculate the slide width
// This makes it responsive.
window.addEventListener('resize', () => {
    // Re-calculate width and go to the current slide
    const newSlideWidth = carouselImages[0].clientWidth;
    carouselSlide.style.transform =
        'translateX(' + -newSlideWidth * currentIndex + 'px)';
});
