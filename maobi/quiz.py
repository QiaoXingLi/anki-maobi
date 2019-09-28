from string import Template

from anki.cards import Card

from maobi.grid import build_hanzi_grid, get_border_style
from .data import _get_character, _load_character_data
from .config import MaobiConfig

_TARGET_DIV = "character-target-div"

TEMPLATE = Template(
    """
<style scoped>
#$target_div {
    display: inline-block;

    // We use outline instead of border in order to not cut into the background grid image: it 
    // can be that the border stroke width would be divided between inside and outside the div,
    // therefore overlapping with the background.
    outline-color: rgb(0, 0, 0);
    outline-style: solid;
    outline-width: 1px;
    outline-offset: -1px;
}

$styles
</style>

$html

<script>
onShownHook.push(function () {
    var writer = HanziWriter.create('$target_div', '$character', {
    width: $size,
    height: $size,
    showCharacter: false,
    showOutline: false,
    highlightOnComplete: true,
    leniency: $leniency,
    padding: 0,
    charDataLoader: function(char, onComplete) {
    var charData = $character_data;
        onComplete(charData);
    }
    });
    writer.quiz();
});
</script>
"""
)


def draw_quiz(html: str, card: Card, config: MaobiConfig) -> str:
    if 'id="' + _TARGET_DIV not in html:
        return html

    # Get the character to write and the corresponding character data
    character = _get_character(card, config)
    character_data = _load_character_data(character)

    styles = [
        get_border_style(_TARGET_DIV),
        build_hanzi_grid(_TARGET_DIV, config.grid)
    ]

    # Render the template
    data = {
        "html": html,
        "target_div": _TARGET_DIV,
        "character": character,
        "character_data": character_data,
        "size": config.size,
        "leniency": config.leniency / 100.0,
        "styles": "\n".join(styles),
    }

    result = TEMPLATE.substitute(data)

    return result






