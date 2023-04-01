# 📷 Computer Vision for Hands Recognition
Input: *an image*

Output: *image with finger landmarks*

This model uses the pre-trained Mediapipe module: https://google.github.io/mediapipe/solutions/hands.html

## Volume Controller with gestures
Calculates the distance between the thumb and the index finger to return the volume between 0 and 100%. 

![py_app](https://user-images.githubusercontent.com/70104233/229285027-97657538-486a-49f4-867a-02268e984a09.gif)

# Libraries
The `handtracking.py` and `volume-hand-control.py` use the following libraries:
- opencv-python
- mediapipe
- numpy

# Online version
Deployed version (in `./online/`) takes use of the **mediapipe for JavaScript**. Gestures do not work very well in the online version, need to add OpenCV.js and change a few things in order to make it work.

![image](https://user-images.githubusercontent.com/70104233/229285235-0b26f6ce-914d-4a53-a530-ffa3beb534c7.png)
