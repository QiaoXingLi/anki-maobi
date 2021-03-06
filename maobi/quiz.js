var curCharacterIdx = -1;
var curQuizDiv = undefined;
var curWriter = undefined;
var prevCharacterDivs = [];

var CHAR_SPACING = 20;
var STROKE_COLOR_DAY = '#333';
var STROKE_COLOR_NIGHT = '#FFF';

var restartQuizAnimationInProgress = false;
var completedStrokes = 0;    //  number of completed strokes of the current quiz

var revealButton = document.getElementById(config.revealButton);
var restartButton = document.getElementById(config.restartButton);
var targetDiv = document.getElementById(config.targetDiv);

var TONE_COLORS = getToneColors();

/**
 * Starts the quiz for the next character and moves all previous characters to the left
 * @param animation 'none' disables animations, 'default' uses a right-to-left fade-in, 'opacity' only animates opacity
 */
function quizNextCharacter(animation) {
    if (curCharacterIdx < data.characters.length - 1) {
        if (curQuizDiv !== undefined) {
            prevCharacterDivs.unshift(curQuizDiv);
        }
        curCharacterIdx++;
        curQuizDiv = document.createElement("div");
        targetDiv.append(curQuizDiv);
        curQuizDiv.style['margin-left'] = -Math.floor(config.size / 2) + 'px';

        var character = data.characters[curCharacterIdx];
        var characterData = data.charactersData[curCharacterIdx];
        var toneColor = data.tones.length > 0 ? TONE_COLORS[data.tones[curCharacterIdx]] : '#555555';
        var drawingColor = document.body.classList.contains('nightMode') ? STROKE_COLOR_NIGHT : STROKE_COLOR_DAY;

        quizCharacter(character, characterData, toneColor, drawingColor, curQuizDiv);

        if (animation !== 'none') {
            curQuizDiv.style.opacity = '0';
            if (curCharacterIdx > 0 && animation === 'default') {
                curQuizDiv.style['margin-left'] = Math.floor(config.size / 2) + CHAR_SPACING + 'px';
            }

            // let webkit render the content before repositioning the new (new) character div. Otherwise the fade-in
            // animation is ignored
            setTimeout(function () {
                repositionDivs()
            }, 50);
        }
    }
}

/**
 * Repositions all character divs (thereby triggering css animations)
 */
function repositionDivs() {
    prevCharacterDivs.forEach(function (div, idx) {
        if (idx < 5) {
            div.style['margin-left'] = Math.floor(-config.size / 2 - (config.size + CHAR_SPACING) * (idx + 1)) + 'px';
        } else {
            div.style.display = 'none';
        }
    });

    curQuizDiv.style['margin-left'] = -Math.floor(config.size / 2) + 'px';
    curQuizDiv.style.opacity = '1';
}

/**
 * Creates and starts the HanziWriter quiz for a given character
 * @param character the character to quiz for
 * @param characterData stroke data
 * @param targetDiv div that should be used for rendering the quiz
 * @param toneColor color of the tone
 * @param drawingColor color of the stroke the user draws
 * @param targetDiv div that should be used for rendering the quiz
 */
function quizCharacter(character, characterData, toneColor, drawingColor, targetDiv) {
    curWriter = HanziWriter.create(targetDiv, character, {
        width: config.size,
        height: config.size,
        showCharacter: false,
        showOutline: false,
        highlightOnComplete: true,
        leniency: config.leniency,
        padding: 0,
        delayBetweenStrokes: 200,
        strokeColor: toneColor,
        drawingColor: drawingColor,
        drawingWidth: 5,
        showHintAfterMisses: config.showHintAfterMisses || Number.MAX_SAFE_INTEGER, // setting showHintAfterMisses to
        // false does not disable the feature
        charDataLoader: function (char, onComplete) {
            onComplete(characterData);
        },
        onComplete: function (data) {
            // wait for HanziWriter finish animation
            curWriter = undefined;
            setTimeout(function () {
                quizNextCharacter('default')
            }, 200);
        },
        onCorrectStroke: function(data){
            completedStrokes = data.strokeNum + 1;
        },
    });
    curWriter.quiz();
    completedStrokes = 0;
}

/**
 * Stops the quiz, reveals the current character, and animates it. Then starts the quiz for this character again
 */
function revealCurrentCharacter() {
    if (curWriter !== undefined && !restartQuizAnimationInProgress) {
        var writer = curWriter;
        writer.showOutline();
        writer.cancelQuiz();
        completedStrokes = 0;
        writer.animateCharacter({
            onComplete: function (e) {
                if (!e.canceled) {
                    // if the animation has been canceled, we do not need to hide
                    setTimeout(function () {
                        writer.hideCharacter();
                        writer.quiz();
                    }, 1000);
                }
            }
        });
    }
}

/**
 * @return the computed color values of the tone colors
 */
function getToneColors() {
    var colors = {};
    for (var i = 1; i <= 5; i++) {
        var toneName = 'tone' + i;
        var tmpSpan = document.createElement('span');
        tmpSpan.className = toneName;
        document.body.appendChild(tmpSpan);
        var color = getComputedStyle(tmpSpan).color;
        document.body.removeChild(tmpSpan);
        colors[toneName] = color;
    }
    return colors;
}

/**
 * Restarts the whole quiz (all characters
 */
function restartQuiz() {
    if (!restartQuizAnimationInProgress) {
        if(curWriter) curWriter.cancelQuiz();
        restartQuizAnimationInProgress = true;

        // if no strokes of the current hanzi have been completed, we restart the whole quiz
        if (completedStrokes === 0) {
            // for convenience; applies a function on all character div elements (current and previous)
            var applyAll = function (fn) {
                if (curQuizDiv) fn(curQuizDiv);
                for (var i = 0; i < prevCharacterDivs.length; i++) {
                    fn(prevCharacterDivs[i]);
                }
            };

            applyAll(function (e) {
                e.style.opacity = '0';
            });

            // on complete after 300ms, which is the duration of the css animation
            setTimeout(function () {
                applyAll(function (e) {
                    if (e.parentNode) e.parentNode.removeChild(e);
                });

                curCharacterIdx = -1;
                curWriter = undefined;
                curQuizDiv = undefined;
                completedStrokes = 0;
                prevCharacterDivs = [];

                restartQuizAnimationInProgress = false;
                quizNextCharacter('default');
            }, 300);
        } else {
            // if some strokes of the current hanzi have been completed, only restart the current hanzi quiz
            curQuizDiv.style.opacity = '0';
            setTimeout(function(){
                if (curQuizDiv.parentNode) curQuizDiv.parentNode.removeChild(curQuizDiv);
                curCharacterIdx -= 1;
                curQuizDiv = undefined;
                completedStrokes = 0;

                restartQuizAnimationInProgress = false;
                quizNextCharacter('opacity');
            }, 300);
        }
    }
}


// Init
// If there is no quiz div, we cannot start maobi
if (targetDiv) {
    quizNextCharacter('none');

    if (revealButton) {
        var revealButtonInnerBtn = document.createElement("button");
        revealButtonInnerBtn.textContent = revealButton.getAttribute("label") || 'Reveal';
        revealButton.append(revealButtonInnerBtn);

        revealButtonInnerBtn.addEventListener('click', function () {
            revealCurrentCharacter();
        });
    }

    if (restartButton) {
        var restartButtonInnerBtn = document.createElement("button");
        restartButtonInnerBtn.textContent = restartButton.getAttribute("label") || 'Restart Quiz';
        restartButton.append(restartButtonInnerBtn);

        restartButtonInnerBtn.addEventListener('click', function () {
            restartQuiz();
        });
    }
} else {
    console.log('Maobi: target div not found: #' + config.targetDiv);
}