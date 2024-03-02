"use strict";

document.addEventListener("DOMContentLoaded", app);

function app() {
    const svg = document.querySelector("#editor");
    const selectFill = document.getElementById("fill");
    const selectStroke = document.getElementById("stroke");
    const selectStrokeWidth = document.getElementById("stroke-width");
    const elemente = document.querySelector("#elemente");
    const selectierectangle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const selectiecircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const selectieline = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const btnExportJpeg = document.getElementById("JPEG");
    const btnExportPng = document.getElementById("PNG");
    const btnSaveSVG = document.getElementById("SVG");
    const btnSave = document.getElementById("btnSave");
    const btnLoad = document.getElementById("btnLoad");

    btnExportJpeg.addEventListener("click", () => exportImage("jpeg"));
    btnExportPng.addEventListener("click", () => exportImage("png"));
    btnSaveSVG.addEventListener("click", saveSVG);
    btnSave.addEventListener("click", saveToLocalStorage);
    btnLoad.addEventListener("click", loadFromLocalStorage);
    

    let moving = false;
    let mx = 0, my = 0, x1 = 0, y1 = 0;
    let selectedElementStartPos = { x: 0, y: 0, cx: 0, cy: 0, x1: 0, y1: 0, x2: 0, y2: 0};
    let selected = { type: null, element: null };
    let undoStack = [];
    const btnRectangle = document.querySelector("#btnRect");
    const btnCircle = document.querySelector("#btnCircle");
    const btnLine = document.querySelector("#btnLine");
    const btnCancel = document.querySelector("#btnCancel");

    btnRectangle.addEventListener("click", handleButtonClick);
    btnCircle.addEventListener("click", handleButtonClick);
    btnLine.addEventListener("click", handleButtonClick);
    btnCancel.addEventListener("click", undoLastModification);

    elemente.innerHTML = '';

    //pentru a selecta un buton
    function handleButtonClick(event) {
        const selectedtype = event.target.id.replace("btn", "").toLowerCase();
        selected.type = selectedtype;

    }

    function exportImage(format) {
        const svgData = new XMLSerializer().serializeToString(svg);

        const image = new Image();
        image.src = `data:image/svg+xml;base64,${btoa(svgData)}`;

        image.onload = function () {
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            canvas.width = svg.width.baseVal.value;
            canvas.height = svg.height.baseVal.value;
            
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);

            const dataURL = canvas.toDataURL(`image/${format}`);
            const link = document.createElement("a");
            link.style.display = 'none';
            link.href = dataURL;
            link.download = `desen.${format}`;
            link.click();          
            document.body.appendChild(link);
        };
    }

    function saveSVG() {
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
    
        const link = document.createElement("a");
        link.style.display = 'none';
        link.href = url;
        link.download = 'desen.svg';
        link.click();
    
        // Eliberam resursele URL create
        URL.revokeObjectURL(url);
    }
    

    function saveToLocalStorage() {
        const svgData = new XMLSerializer().serializeToString(svg);
        localStorage.setItem('savedDrawing', svgData);
    }

    function loadFromLocalStorage() {
        const savedDrawing = localStorage.getItem('savedDrawing');
        if (savedDrawing) {
            svg.innerHTML = savedDrawing;
        }
    } 

    //click pe element plus tasta "S"
    function settingsPick() {
        //console.log("settingsPick");
        const fillColor = selectFill.value;
        const strokeColor = selectStroke.value;
        const strokeWidth = selectStrokeWidth.value;

        if (selected.type !== null && selected.type instanceof Element) {
            //salvare valori elem vechi pentru a putea fi anulata schimbarea la nevoie
            const oldFill = selected.type.getAttributeNS(null, 'fill');
            const oldStroke = selected.type.getAttributeNS(null, 'stroke');
            const oldStrokeWidth = selected.type.getAttributeNS(null, 'stroke-width');
    
            selected.type.setAttributeNS(null, 'fill', fillColor);
            selected.type.setAttributeNS(null, 'stroke', strokeColor);
            selected.type.setAttributeNS(null, 'stroke-width', strokeWidth);
    
            addToUndoStack('settings', { element: selected.type, oldFill, oldStroke, oldStrokeWidth });
        }
        //resetare valori la cele normale
        selectFill.value = selectFill.defaultValue;
        selectStroke.value = selectStroke.defaultValue;
        selectStrokeWidth.value = selectStrokeWidth.defaultValue;

    }

    svg.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });


    //mutam elemente sau desenam
    svg.addEventListener('mousemove', (e) => {
        mx = e.clientX - svg.getBoundingClientRect().left;
        my = e.clientY - svg.getBoundingClientRect().top;
        //console.log(mx, my);
        if (moving) {
            switch (selected.type) {
                case "rect":
                    drawRectangle();
                    break;
                case "circle":
                    drawCircle();
                    break;
                case "line":
                    drawLine();
                    break;
                default:
                    moveSelectedElement();
                    break;
            }
        }
    });
    
    

    //selectam un element
    svg.addEventListener("mousedown", (e) => {
        if (e.button !== 0) {
            return;
        }
        moving = true;
        x1 = mx;
        y1 = my;
        //console.log(x1, y1);
    
        const targetElement = e.target.closest('rect, circle, line');
        if (targetElement !== null) {
            selected.type = targetElement;
            selected.element = targetElement.tagName.toLowerCase();
            
            if (selected.type.tagName === "circle") {
                selectedElementStartPos.cx = parseFloat(selected.type.getAttributeNS(null, "cx"));
                selectedElementStartPos.cy = parseFloat(selected.type.getAttributeNS(null, "cy"));
            } else if (selected.type.tagName === "rect") {
                selectedElementStartPos.x = parseInt(selected.type.getAttributeNS(null, "x"));
                selectedElementStartPos.y = parseInt(selected.type.getAttributeNS(null, "y"));
            } else if (selected.type.tagName === "line") {
                selectedElementStartPos.x1 = parseFloat(selected.type.getAttributeNS(null, "x1"));
                selectedElementStartPos.y1 = parseFloat(selected.type.getAttributeNS(null, "y1"));
                selectedElementStartPos.x2 = parseFloat(selected.type.getAttributeNS(null, "x2"));
                selectedElementStartPos.y2 = parseFloat(selected.type.getAttributeNS(null, "y2"));
            }
        }
    });
    
    

    svg.addEventListener("mouseup", (e) => {
        if (e.button !== 0) {
            return;
        }
        //console.log("Moving:", moving);

        if (moving) {
            switch (selected.type) {
                case "rect":
                    createRectangle();
                    break;
                case "circle":
                    createCircle();
                    break;
                case "line":
                    createLine();
                    break;
                default:
                    break;
            }
        }

        moving = false;
    });

    document.addEventListener("keydown", (e) => {
        if (selected.type !== null) {
            switch (e.keyCode) {
                case 68: // "D" key
                    deleteSelectedElement();
                    break;
                case 83: // "S" key
                    settingsPick();
                    break;
                default:
                    break;
            }
        }
    });


    function moveRectangle() {
        //console.log("moveRectangle");
        const deltaX = mx - x1;
        const deltaY = my - y1;
    
        const newX = selectedElementStartPos.x + deltaX;
        const newY = selectedElementStartPos.y + deltaY;
    
        selected.type.setAttributeNS(null, "x", newX);
        selected.type.setAttributeNS(null, "y", newY);

        //pentru a putea face Cancel
        addToUndoStack('move', { element: selected.type, oldX: selectedElementStartPos.x, oldY: selectedElementStartPos.y });
    }
    
    
    function moveCircle() {
        //console.log("moveCircle");
        const deltaX = mx - x1;
        const deltaY = my - y1;
    
        const oldCX = selectedElementStartPos.cx;
        const oldCY = selectedElementStartPos.cy;
    
        const newcx = oldCX + deltaX;
        const newcy = oldCY + deltaY;
    
        selected.type.setAttributeNS(null, "cx", newcx);
        selected.type.setAttributeNS(null, "cy", newcy);
    
        addToUndoStack('move', { element: selected.type, oldCX, oldCY });
    }
    
    function moveLine() {
        //console.log("moveLine");
        const deltaX1 = mx - x1;
        const deltaY1 = my - y1;
        const newx1 = selectedElementStartPos.x1 + deltaX1;
        const newy1 = selectedElementStartPos.y1 + deltaY1;
        const newx2 = selectedElementStartPos.x2 + deltaX1;  
        const newy2 = selectedElementStartPos.y2 + deltaY1;
    
        selected.type.setAttributeNS(null, "x1", newx1);
        selected.type.setAttributeNS(null, "y1", newy1);
        selected.type.setAttributeNS(null, "x2", newx2);
        selected.type.setAttributeNS(null, "y2", newy2);
    
        addToUndoStack('move', { element: selected.type, oldX1: selectedElementStartPos.x1, oldY1: selectedElementStartPos.y1, oldX2: selectedElementStartPos.x2, oldY2: selectedElementStartPos.y2 });
    }
    

    function moveSelectedElement() {
        if (selected.type !== null && selected.type instanceof Element) {
            switch (selected.type.tagName.toLowerCase()) {
                case "rect":
                    moveRectangle();
                    break;
                case "circle":
                    moveCircle();
                    break;
                case "line":
                    moveLine();
                    break;
                default:
                    break;
            }
        }
        

    }
     

    //stiva cu actiunile de creare, mutare, editare
    function addToUndoStack(actionType, payload) {
        undoStack.push({ actionType, payload });
    }

    //pentru butonul Cancel, creare, editare, mutare
    function undoLastModification() {
        if (undoStack.length > 0) {
            const lastAction = undoStack.pop();
    
            switch (lastAction.actionType) {
                //console.log(lastAction.actionType);
                case 'create':
                    lastAction.payload.remove();
                    break;
                case 'settings':
                    lastAction.payload.element.setAttributeNS(null, 'fill', lastAction.payload.oldFill);
                    lastAction.payload.element.setAttributeNS(null, 'stroke', lastAction.payload.oldStroke);
                    lastAction.payload.element.setAttributeNS(null, 'stroke-width', lastAction.payload.oldStrokeWidth);
                    break;
                case 'move':
                    //console.log(lastAction.payload.element.tagName.toLowerCase());
                    if(lastAction.payload.element.tagName.toLowerCase() === "rect")
                    {lastAction.payload.element.setAttributeNS(null, 'x', lastAction.payload.oldX);
                    lastAction.payload.element.setAttributeNS(null, 'y', lastAction.payload.oldY);
                    }else if(lastAction.payload.element.tagName.toLowerCase() === "circle")
                    {lastAction.payload.element.setAttributeNS(null, 'cx', lastAction.payload.oldCX);
                    lastAction.payload.element.setAttributeNS(null, 'cy', lastAction.payload.oldCY);
                    }else if(lastAction.payload.element.tagName.toLowerCase() === "line")
                    {lastAction.payload.element.setAttributeNS(null, 'x1', lastAction.payload.oldX1);
                    lastAction.payload.element.setAttributeNS(null, 'y1', lastAction.payload.oldY1);
                    lastAction.payload.element.setAttributeNS(null, 'x2', lastAction.payload.oldX2);
                    lastAction.payload.element.setAttributeNS(null, 'y2', lastAction.payload.oldY2);
                    }
                       break;
                case 'delete':
                    svg.appendChild(lastAction.payload.element);
                    break;
            }
        }
    }
     

    //putem sterge prin click pe element + tasta "D" sau duclu click pe element
    function deleteSelectedElement() {
        if (selected.type !== null) {
            const deletedElement = selected.type.cloneNode(true);
            selected.type.remove();
            selected.type = null;

            addToUndoStack('delete', { element: deletedElement });
        }

        selectFill.value = selectFill.defaultValue;
        selectStroke.value = selectStroke.defaultValue;
        selectStrokeWidth.value = selectStrokeWidth.defaultValue;
    }

    function createRectangle() {
        const rectangle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rectangle.setAttributeNS(null, "fill", selectFill.value);
        rectangle.setAttributeNS(null, "stroke", selectStroke.value);
        rectangle.setAttributeNS(null, "stroke-width", selectStrokeWidth.value);
        rectangle.setAttributeNS(null, "x", Math.min(x1, mx));
        rectangle.setAttributeNS(null, "y", Math.min(y1, my));
        rectangle.setAttributeNS(null, "width", Math.abs(mx - x1));
        rectangle.setAttributeNS(null, "height", Math.abs(my - y1));

        elemente.appendChild(rectangle);
        svg.appendChild(rectangle);
        addToUndoStack('create', rectangle);

        rectangle.addEventListener("click", (e) => {
            e.preventDefault();
            selected.type = rectangle;
            selected.element = rectangle.tagName;
        });

        rectangle.addEventListener("dblclick", (e) => {
            e.preventDefault();
            deleteSelectedElement(rectangle);
        });
    }

    function createCircle() {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttributeNS(null, "fill", selectFill.value);
        circle.setAttributeNS(null, "stroke", selectStroke.value);
        circle.setAttributeNS(null, "stroke-width", selectStrokeWidth.value);
        circle.setAttributeNS(null, "cx", x1);
        circle.setAttributeNS(null, "cy", y1);
        circle.setAttributeNS(null, "r", Math.max(Math.abs(mx - x1), Math.abs(my - y1)));

        elemente.appendChild(circle);
        svg.appendChild(circle);
        addToUndoStack('create', circle);

        circle.addEventListener("click", (e) => {
            e.preventDefault();
            selected.type = circle;
            selected.element = circle.tagName;
        });

        circle.addEventListener("dblclick", (e) => {
            e.preventDefault();
            deleteSelectedElement(circle);
        });
    }



    function createLine() {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttributeNS(null, "stroke", selectStroke.value);
        line.setAttributeNS(null, "stroke-width", selectStrokeWidth.value);
        line.style.display = "block";
        line.setAttributeNS(null, "x1", x1);
        line.setAttributeNS(null, "y1", y1);
        line.setAttributeNS(null, "x2", mx);
        line.setAttributeNS(null, "y2", my);

        elemente.appendChild(line);
        svg.appendChild(line);
        addToUndoStack('create', line);

        line.addEventListener("click", (e) => {
            e.preventDefault();
            selected.type = line;
            selected.element = line.tagName;
        });

        line.addEventListener("dblclick", (e) => {
            e.preventDefault();
            deleteSelectedElement(line);
        });
    }

    function desenare() {
        if (moving) {
            switch (selected.type) {
                case "rect":
                    drawRectangle();
                    break;
                case "circle":
                    drawCircle();
                    break;
                case "line":
                    drawLine();
                    break;
                default:
                    break;
            }
        } else {
            selectierectangle.style.display = "none";
            selectiecircle.style.display = "none";
            selectieline.style.display = "none";
        }

        requestAnimationFrame(desenare);
    }

    function drawRectangle() {
        if (selected.type && selected.type.tagName === "rect") {
            const minX = Math.min(x1, mx);
            const minY = Math.min(y1, my);
            const width = Math.abs(mx - x1);
            const height = Math.abs(my - y1);
    
            selectierectangle.style.display = "block";
            selectierectangle.setAttributeNS(null, "x", minX);
            selectierectangle.setAttributeNS(null, "y", minY);
            selectierectangle.setAttributeNS(null, "width", width);
            selectierectangle.setAttributeNS(null, "height", height);
     
            // Actualizam pozitia initiala pentru mutarea ulterioara
            selectedElementStartPos.x = minX;
            selectedElementStartPos.y = minY;
        }
    }

    function drawCircle() {
        if (selected.type && selected.type.tagName === "circle") {
            const minX = Math.min(x1, mx);
            const minY = Math.min(y1, my);
    
            selectiecircle.style.display = "block";
            selectiecircle.setAttributeNS(null, "cx", minX);
            selectiecircle.setAttributeNS(null, "cy", minY);
            selectiecircle.setAttributeNS(null, "r", Math.max(Math.abs(mx - x1), Math.abs(my - y1)));
    
            // Actualizam pozitia initiala pentru mutarea ulterioara
            selectedElementStartPos.cx = minX;
            selectedElementStartPos.cy = minY;
        }
    }
    
    function drawLine() {
        if (selected.type && selected.type.tagName === "line") {
            selectieline.style.display = "block";
            selectieline.setAttributeNS(null, "x1", x1);
            selectieline.setAttributeNS(null, "y1", y1);
            selectieline.setAttributeNS(null, "x2", mx);
            selectieline.setAttributeNS(null, "y2", my);
    
            // Actualizam pozitia initiala pentru mutarea ulterioara
            selectedElementStartPos.x1 = x1;
            selectedElementStartPos.y1 = y1;
            selectedElementStartPos.x2 = mx;
            selectedElementStartPos.y2 = my;
        }
    }

    desenare();
    
}
