"""
detect_points.py - Скрипт для автоматического определения координат
красных и фиолетовых точек на уровнях игры.

Исправленная версия:
- Работает в headless-режиме (без GUI)
- Сохраняет результаты в файл
- Корректно обрабатывает ошибки
"""

import cv2
import numpy as np
from pathlib import Path
import json


def detect_colored_points(image_path, output_dir="detected"):
    """
    Находит красные и фиолетовые точки на изображении уровня.

    Args:
        image_path: путь к изображению уровня
        output_dir: директория для сохранения результатов

    Returns:
        dict: координаты найденных точек
    """
    # Создаем директорию для результатов
    Path(output_dir).mkdir(exist_ok=True)

    # Загружаем изображение
    img = cv2.imread(str(image_path))
    if img is None:
        print(f"ОШИБКА: Не удалось загрузить изображение: {image_path}")
        return None

    h, w = img.shape[:2]
    print(f"\n{'='*50}")
    print(f"Обработка: {image_path}")
    print(f"Размер изображения: {w}x{h}")
    print(f"{'='*50}")

    # Конвертируем в HSV для лучшего распознавания цветов
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # ========== КРАСНЫЙ ЦВЕТ ==========
    # Красный цвет в HSV имеет два диапазона (вокруг 0° и 180°)
    lower_red1 = np.array([0, 80, 80])
    upper_red1 = np.array([15, 255, 255])
    lower_red2 = np.array([165, 80, 80])
    upper_red2 = np.array([180, 255, 255])

    mask_red1 = cv2.inRange(hsv, lower_red1, upper_red1)
    mask_red2 = cv2.inRange(hsv, lower_red2, upper_red2)
    mask_red = cv2.bitwise_or(mask_red1, mask_red2)

    # ========== ФИОЛЕТОВЫЙ/ПУРПУРНЫЙ ЦВЕТ ==========
    lower_purple = np.array([120, 50, 50])
    upper_purple = np.array([170, 255, 255])
    mask_purple = cv2.inRange(hsv, lower_purple, upper_purple)

    # Морфологические операции для удаления шума
    kernel = np.ones((3, 3), np.uint8)
    mask_red = cv2.morphologyEx(mask_red, cv2.MORPH_OPEN, kernel)
    mask_red = cv2.morphologyEx(mask_red, cv2.MORPH_CLOSE, kernel)
    mask_purple = cv2.morphologyEx(mask_purple, cv2.MORPH_OPEN, kernel)
    mask_purple = cv2.morphologyEx(mask_purple, cv2.MORPH_CLOSE, kernel)

    result = {
        "filename": str(image_path),
        "width": w,
        "height": h,
        "red_points": [],
        "purple_points": []
    }

    def find_centers(mask, color_name, color_bgr):
        """Находит центры контуров и возвращает их координаты."""
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        centers = []

        for cnt in contours:
            area = cv2.contourArea(cnt)
            # Фильтруем слишком маленькие области (шум)
            if area > 30:
                M = cv2.moments(cnt)
                if M["m00"] != 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])

                    # Конвертируем в проценты
                    px = round((cx / w) * 100, 1)
                    py = round((cy / h) * 100, 1)

                    centers.append({
                        "x_pixels": cx,
                        "y_pixels": cy,
                        "x_percent": px,
                        "y_percent": py,
                        "area": int(area)
                    })

                    print(f"  {color_name} точка: ({cx}, {cy}) пикс | ({px}%, {py}%) | площадь={area:.0f}")

                    # Рисуем метку на изображении
                    cv2.circle(img, (cx, cy), 8, color_bgr, -1)
                    cv2.circle(img, (cx, cy), 12, color_bgr, 2)
                    cv2.putText(img, f"{color_name}", (cx + 15, cy - 10),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, color_bgr, 2)

        return centers

    # Находим точки
    result["red_points"] = find_centers(mask_red, "КРАСНАЯ", (0, 0, 255))
    result["purple_points"] = find_centers(mask_purple, "ФИОЛЕТОВАЯ", (255, 0, 255))

    # Сохраняем результат с разметкой
    output_path = Path(output_dir) / f"detected_{Path(image_path).name}"
    cv2.imwrite(str(output_path), img)
    print(f"  Результат сохранен: {output_path}")

    return result


def process_all_levels(levels_dir="levels", output_file="coordinates.json"):
    """
    Обрабатывает все уровни и сохраняет координаты в JSON.

    Args:
        levels_dir: директория с изображениями уровней
        output_file: файл для сохранения результатов
    """
    levels_path = Path(levels_dir)

    if not levels_path.exists():
        print(f"ОШИБКА: Директория {levels_dir} не найдена!")
        print("Убедитесь, что скрипт запущен из корневой директории проекта.")
        return

    all_results = {}

    # Обрабатываем все jpg файлы в директории
    for level_file in sorted(levels_path.glob("level_*.jpg")):
        result = detect_colored_points(level_file)
        if result:
            level_num = int(level_file.stem.split("_")[1])
            all_results[f"level_{level_num}"] = result

    # Сохраняем в JSON
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*50}")
    print(f"Все координаты сохранены в: {output_file}")
    print(f"{'='*50}")

    # Выводим сводку для game.js
    print("\n--- Код для game.js ---")
    for level_name, data in all_results.items():
        level_num = level_name.split("_")[1]
        print(f"\n{level_name}:")
        for point in data["red_points"]:
            print(f"  red: x={point['x_percent']}, y={point['y_percent']}")
        for point in data["purple_points"]:
            print(f"  purple: x={point['x_percent']}, y={point['y_percent']}")


if __name__ == "__main__":
    # Проверяем наличие OpenCV
    try:
        print(f"OpenCV версия: {cv2.__version__}")
    except ImportError:
        print("ОШИБКА: OpenCV не установлен!")
        print("Установите: pip install opencv-python")
        exit(1)

    process_all_levels()
