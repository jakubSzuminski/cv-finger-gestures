# Libraries for the hand detection & image processing
import cv2
import time
import math
import numpy as np

import handtracking as ht

#####################
w_cam, h_cam = 1280, 720
#####################

cap = cv2.VideoCapture(1)
cap.set(3, w_cam)
cap.set(4, h_cam)

previous_time = 0
volume = 0
volume_bar_height = 400

detector = ht.HandDetector(detection_confidence=0.75)

while True:
    success, img = cap.read()

    img = detector.find_hands(img)
    lm_list, bbox = detector.find_position(img, draw=False)  # landmark list

    if len(lm_list) != 0:  # when there are landmarks (hand detected)
        # finger indexes taken from mediapipe documentation
        x1, y1 = lm_list[4][1], lm_list[4][2]  # thumb position
        x2, y2 = lm_list[8][1], lm_list[8][2]  # index finger position
        cx, cy = (x1 + x2) // 2, (y1 + y2) // 2

        cv2.circle(img, (x1, y1), 15, (255, 0, 255), cv2.FILLED)  # draw a pink circle on thumb
        cv2.circle(img, (x2, y2), 15, (255, 0, 255), cv2.FILLED)  # draw a pink circle on the index finger
        cv2.circle(img, (cx, cy), 15, (255, 100, 255), cv2.FILLED)  # draw a circle in the middle point between those fingers
        cv2.line(img, (x1, y1), (x2, y2), (255, 0, 255), 3)  # draw a line between the tip of the thumb and the tip of the index finger

        finger_distance = math.hypot(x2 - x1, y2 - y1)  # this is the length of the line between those fingers

        # Hand range (about 50 - 300)
        # Volume Range (0 - 100)
        # np.interp for linear interpolation to convert the ranges
        volume = np.interp(finger_distance, [50, 270], [0, 100])
        volume_bar_height = np.interp(finger_distance, [50, 270], [400, 150])

    cv2.rectangle(img, (50, 150), (85, 400), (0, 255, 0), 3)
    cv2.rectangle(img, (50, int(volume_bar_height)), (85, 400), (0, 255, 0), cv2.FILLED)

    current_time = time.time()
    fps = 1/(current_time - previous_time)
    previous_time = current_time

    cv2.putText(img, f'{int(volume)}%', (50, 450), cv2.FONT_HERSHEY_COMPLEX, 1, (0, 255, 0), 2)
    cv2.putText(img, f'FPS: {int(fps)}', (40, 70), cv2.FONT_HERSHEY_COMPLEX, 1, (255, 0, 0), 3)

    cv2.imshow('Img', img)
    cv2.waitKey(1)