function initScrabbleLogo() {
  const logoWrapper = document.getElementById("scrabble-logo-wrapper");
  const container = document.getElementById("scrabble-logo");
  const _logoLink = document.getElementById("scrabble-logo-link");
  //TODO use _logoLink to navigate on click Unused constant logoLink
  if (!logoWrapper || !container) {
    console.error("Scrabble logo elements not found");
    return;
  }

  let draggedTile: HTMLElement | null = null;
  let pressTimer: number | null = null;
  const PRESS_DURATION = 300;

  let pressStartTime = 0;
  let hasMoved = false;
  let startX = 0;
  let startY = 0;

  container.addEventListener("mousedown", (e: MouseEvent) => {
    const tile = (e.target as HTMLElement).closest(".scrabble-tile") as HTMLElement | null;
    if (!tile) return;

    pressStartTime = Date.now();
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;

    pressTimer = window.setTimeout(() => {
      tile.setAttribute("draggable", "true");
      tile.style.opacity = "0.7";
      tile.style.transform = "scale(1.1)";
    }, PRESS_DURATION);
  });

  container.addEventListener("mousemove", (e: MouseEvent) => {
    if (pressStartTime > 0 && e.buttons === 1) {
      const moveX = Math.abs(e.clientX - startX);
      const moveY = Math.abs(e.clientY - startY);
      if (moveX > 5 || moveY > 5) {
        hasMoved = true;
      }
    }
  });

  container.addEventListener("mouseup", (e: MouseEvent) => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }

    const tile = (e.target as HTMLElement).closest(".scrabble-tile") as HTMLElement | null;
    if (tile) {
      tile.style.opacity = "";
      tile.style.transform = "";
      tile.setAttribute("draggable", "false");

      const pressDuration = pressStartTime > 0 ? Date.now() - pressStartTime : 0;
      if (pressDuration < PRESS_DURATION && !hasMoved && pressDuration >= 0) {
        return;
      }
    }

    setTimeout(() => {
      pressStartTime = 0;
      hasMoved = false;
    }, 100);
  });

  container.addEventListener(
    "dragstart",
    (e: DragEvent) => {
      const tile = (e.target as HTMLElement).closest(".scrabble-tile") as HTMLElement | null;
      if (!tile || tile.getAttribute("draggable") !== "true") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      draggedTile = tile;
      e.dataTransfer!.effectAllowed = "move";
      e.dataTransfer!.setData("text/plain", "");

      const dragImage = document.createElement("div");
      dragImage.style.position = "absolute";
      dragImage.style.top = "-1000px";
      dragImage.style.width = "40px";
      dragImage.style.height = "40px";
      document.body.appendChild(dragImage);
      e.dataTransfer!.setDragImage(dragImage, 20, 20);
      setTimeout(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      }, 0);

      console.log("Drag started:", tile);
      return true;
    },
    true,
  );

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer!.dropEffect = "move";

    const target = e.target as HTMLElement;
    const targetTile = target?.closest(".scrabble-tile") as HTMLElement | null;

    container.querySelectorAll(".scrabble-tile").forEach((t) => {
      const tile = t as HTMLElement;
      if (tile !== draggedTile) {
        tile.style.borderColor = "";
        tile.style.borderWidth = "";
      }
    });

    if (targetTile && targetTile !== draggedTile) {
      targetTile.style.borderColor = "#fbbf24";
      targetTile.style.borderWidth = "3px";
    }
  };

  container.addEventListener("dragover", handleDragOver);
  logoWrapper.addEventListener("dragover", handleDragOver);
  document.addEventListener("dragover", (e: DragEvent) => {
    if ((e.target as HTMLElement)?.closest(".scrabble-logo-container")) {
      handleDragOver(e);
    }
  });

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("DROP EVENT FIRED!", { draggedTile, target: e.target });

    if (!draggedTile) {
      console.log("No dragged tile in drop handler");
      return;
    }

    const target = e.target as HTMLElement;
    const targetTile = target.closest(".scrabble-tile") as HTMLElement | null;

    console.log("Drop target:", { targetTile, target, draggedTile });

    if (targetTile && targetTile !== draggedTile) {
      const parent = draggedTile.parentNode;
      if (!parent) {
        console.error("No parent node");
        return;
      }

      const draggedIndex = Array.from(parent.children).indexOf(draggedTile);
      const targetIndex = Array.from(parent.children).indexOf(targetTile);

      console.log("Swapping tiles:", { draggedIndex, targetIndex });

      if (draggedIndex < targetIndex) {
        parent.insertBefore(targetTile, draggedTile);
        parent.insertBefore(draggedTile, targetTile.nextSibling);
      } else {
        parent.insertBefore(draggedTile, targetTile);
        parent.insertBefore(targetTile, draggedTile.nextSibling);
      }

      console.log("Tiles swapped successfully!");
    } else if (!targetTile) {
      const tiles = Array.from(container.children) as HTMLElement[];
      const dropX = e.clientX;

      let closestTile: HTMLElement | null = null;
      let closestDistance = Infinity;

      tiles.forEach((tile) => {
        if (tile === draggedTile) return;
        const rect = tile.getBoundingClientRect();
        const tileX = rect.left + rect.width / 2;
        const distance = Math.abs(dropX - tileX);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestTile = tile;
        }
      });

      if (closestTile) {
        const parent = draggedTile.parentNode;
        if (parent) {
          parent.insertBefore(draggedTile, closestTile);
          console.log("Tile moved to closest position");
        }
      }
    }

    if (draggedTile) {
      draggedTile.style.opacity = "";
      draggedTile.style.transform = "";
      draggedTile.setAttribute("draggable", "false");
    }
    draggedTile = null;
  };

  container.addEventListener("drop", handleDrop);
  logoWrapper.addEventListener("drop", handleDrop);
  document.addEventListener("drop", (e: DragEvent) => {
    if ((e.target as HTMLElement)?.closest(".scrabble-logo-container")) {
      handleDrop(e);
    }
  });

  container.addEventListener("dragend", () => {
    container.querySelectorAll(".scrabble-tile").forEach((t) => {
      const tile = t as HTMLElement;
      tile.style.borderColor = "";
      tile.style.borderWidth = "";
    });

    if (draggedTile) {
      draggedTile.style.opacity = "";
      draggedTile.style.transform = "";
      draggedTile.setAttribute("draggable", "false");
    }
    draggedTile = null;
    console.log("Drag ended");
  });

  container.addEventListener("dragleave", (e: DragEvent) => {
    const target = e.target as HTMLElement;
    const targetTile = target.closest(".scrabble-tile") as HTMLElement | null;
    if (targetTile) {
      targetTile.style.borderColor = "";
      targetTile.style.borderWidth = "";
    }
  });

  container.addEventListener(
    "click",
    (e: MouseEvent) => {
      const tile = (e.target as HTMLElement).closest(".scrabble-tile") as HTMLElement | null;
      if (!tile) return;

      if (tile.getAttribute("draggable") !== "true" && !hasMoved) {
        const clickDuration = pressStartTime > 0 ? Date.now() - pressStartTime : 0;
        if (clickDuration < PRESS_DURATION && clickDuration >= 0) {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = "/";
        }
      }
    },
    true,
  );

  logoWrapper.setAttribute("draggable", "false");
  logoWrapper.addEventListener(
    "dragstart",
    (e: DragEvent) => {
      const target = e.target as HTMLElement;
      const tile = target.closest(".scrabble-tile") as HTMLElement | null;
      if (!tile || tile.getAttribute("draggable") !== "true") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    },
    true,
  );

  container.addEventListener("contextmenu", (e: MouseEvent) => {
    const tile = (e.target as HTMLElement).closest(".scrabble-tile") as HTMLElement | null;
    if (tile) {
      e.preventDefault();
    }
  });

  container.addEventListener("selectstart", (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.closest(".scrabble-tile")) {
      e.preventDefault();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initScrabbleLogo);
} else {
  initScrabbleLogo();
}
