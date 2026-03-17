const GAME_WIDTH = 620;
const GAME_HEIGHT = 430;
const COLLECTION_NAME = "micro_games";

let workspace;
let game;
let sceneController;

class MicroScene extends Phaser.Scene {
    constructor() {
        super({ key: "micro-scene" });
        this.score = 0;
        this.isWon = false;
    }

    create() {
        sceneController = this;
        this.cameras.main.setBackgroundColor("#11172e");
        const ground = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 18, GAME_WIDTH, 36, 0x31406f);
        this.physics.add.existing(ground, true);

        this.player = this.physics.add.rectangle(85, GAME_HEIGHT - 60, 34, 34, 0x4f7dff);
        this.player.body.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, ground);

        this.pickups = this.physics.add.group();
        this.physics.add.overlap(this.player, this.pickups, (_player, pickup) => {
            pickup.destroy();
            this.addScore(10);
            this.updateStatus("Collected pickup (+10 score).");
        });

        this.scoreText = this.add.text(14, 12, "Score: 0", {
            color: "#f1f5ff",
            fontFamily: "monospace",
            fontSize: "18px"
        });

        this.winText = this.add.text(GAME_WIDTH / 2, 54, "", {
            color: "#00d48b",
            fontFamily: "monospace",
            fontSize: "28px"
        }).setOrigin(0.5, 0.5);
    }

    moveRight() {
        this.player.body.setVelocityX(210);
        this.time.delayedCall(230, () => this.player.body.setVelocityX(0));
        this.updateStatus("Move action executed.");
    }

    jump() {
        if (this.player.body.blocked.down) {
            this.player.body.setVelocityY(-310);
            this.updateStatus("Jump action executed.");
            return;
        }
        this.updateStatus("Jump ignored. Player is not on ground.");
    }

    spawnPickup() {
        const x = Phaser.Math.Between(120, GAME_WIDTH - 50);
        const y = Phaser.Math.Between(120, GAME_HEIGHT - 120);
        const pickup = this.add.rectangle(x, y, 20, 20, 0xf4b940);
        this.physics.add.existing(pickup);
        pickup.body.setAllowGravity(false);
        this.pickups.add(pickup);
        this.updateStatus("Spawn action created a pickup.");
    }

    addScore(points = 10) {
        this.score += points;
        this.scoreText.setText(`Score: ${this.score}`);
        this.updateStatus(`Score action added ${points}.`);
    }

    win() {
        if (this.score >= 50) {
            this.isWon = true;
            this.winText.setText("You win!");
            this.updateStatus("Win action succeeded.");
            return true;
        }
        this.updateStatus("Win action failed. Need score >= 50.");
        return false;
    }

    updateStatus(message) {
        const statusNode = document.getElementById("game-status");
        statusNode.textContent = message;
    }
}

function initPhaser() {
    game = new Phaser.Game({
        type: Phaser.AUTO,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        parent: "phaser-stage",
        physics: {
            default: "arcade",
            arcade: { gravity: { y: 600 }, debug: false }
        },
        scene: [MicroScene]
    });
}

function defineBlocklyBlocks() {
    Blockly.defineBlocksWithJsonArray([
        {
            type: "micro_action",
            message0: "do %1",
            args0: [
                {
                    type: "field_dropdown",
                    name: "ACTION",
                    options: [
                        ["move", "move"],
                        ["jump", "jump"],
                        ["spawn", "spawn"],
                        ["score", "score"],
                        ["win", "win"]
                    ]
                }
            ],
            previousStatement: null,
            nextStatement: null,
            colour: 220,
            tooltip: "Execute a micro-game action"
        }
    ]);
}

function initBlockly() {
    defineBlocklyBlocks();
    workspace = Blockly.inject("blockly-editor", {
        toolbox: document.getElementById("toolbox"),
        trashcan: true,
        move: { scrollbars: true, drag: true, wheel: true }
    });

    const starterXml = `
        <xml xmlns="https://developers.google.com/blockly/xml">
            <block type="micro_action" x="20" y="20">
                <field name="ACTION">spawn</field>
                <next>
                    <block type="micro_action">
                        <field name="ACTION">move</field>
                        <next>
                            <block type="micro_action">
                                <field name="ACTION">score</field>
                            </block>
                        </next>
                    </block>
                </next>
            </block>
        </xml>
    `;

    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(starterXml), workspace);
}

function actionsFromWorkspace() {
    const topBlocks = workspace.getTopBlocks(true);
    const actions = [];

    const pushChain = (block) => {
        let current = block;
        while (current) {
            if (current.type === "micro_action") {
                actions.push(current.getFieldValue("ACTION"));
            }
            current = current.getNextBlock();
        }
    };

    topBlocks.forEach(pushChain);
    return actions;
}

function logicRulesFromActions(actions) {
    return actions.map((action) => ({ action }));
}

function registerJsonLogicOperations() {
    jsonLogic.add_operation("runAction", (actionName) => {
        if (!sceneController) {
            return false;
        }

        const actionMap = {
            move: () => sceneController.moveRight(),
            jump: () => sceneController.jump(),
            spawn: () => sceneController.spawnPickup(),
            score: () => sceneController.addScore(10),
            win: () => sceneController.win()
        };

        const action = actionMap[actionName];
        if (!action) {
            return false;
        }

        action();
        return true;
    });
}

async function runWorkspaceActions() {
    const actions = actionsFromWorkspace();
    if (!actions.length) {
        setStatus("game-status", "No actions found. Add at least one action block.");
        return;
    }

    const rules = logicRulesFromActions(actions);
    for (const rule of rules) {
        jsonLogic.apply({ runAction: [{ var: "action" }] }, rule);
        await new Promise((resolve) => setTimeout(resolve, 260));
    }
}

function currentProjectPayload() {
    return {
        name: document.getElementById("project-name").value.trim(),
        blockly_xml: Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace)),
        actions: actionsFromWorkspace(),
        updated_at: new Date().toISOString()
    };
}

async function fetchPocketBaseUrl() {
    try {
        const response = await fetch("/api/config");
        if (!response.ok) {
            return;
        }
        const data = await response.json();
        if (data.pocketbase_url) {
            document.getElementById("pocketbase-url").value = data.pocketbase_url;
        }
    } catch (_error) {
        setStatus("storage-status", "Could not read /api/config. Enter PocketBase URL manually.");
    }
}

function getPocketBaseClient() {
    const url = document.getElementById("pocketbase-url").value.trim();
    if (!url) {
        throw new Error("PocketBase URL is required.");
    }
    return new PocketBase(url);
}

async function saveProject() {
    const payload = currentProjectPayload();
    if (!payload.name) {
        setStatus("storage-status", "Project name is required before saving.");
        return;
    }

    const pb = getPocketBaseClient();
    try {
        const existing = await pb.collection(COLLECTION_NAME).getFirstListItem(`name='${payload.name.replace(/'/g, "\\'")}'`);
        await pb.collection(COLLECTION_NAME).update(existing.id, payload);
        setStatus("storage-status", `Saved project ${payload.name} (updated).`);
    } catch (_error) {
        try {
            await pb.collection(COLLECTION_NAME).create(payload);
            setStatus("storage-status", `Saved project ${payload.name} (created).`);
        } catch (createError) {
            setStatus("storage-status", `Save failed: ${createError.message}`);
        }
    }
}

async function loadProject() {
    const projectName = document.getElementById("project-name").value.trim();
    if (!projectName) {
        setStatus("storage-status", "Project name is required before loading.");
        return;
    }

    const pb = getPocketBaseClient();
    try {
        const record = await pb.collection(COLLECTION_NAME).getFirstListItem(`name='${projectName.replace(/'/g, "\\'")}'`);
        workspace.clear();
        const xml = Blockly.utils.xml.textToDom(record.blockly_xml);
        Blockly.Xml.domToWorkspace(xml, workspace);
        setStatus("storage-status", `Loaded project ${projectName}.`);
        setStatus("game-status", "Project loaded. Press Run actions.");
    } catch (error) {
        setStatus("storage-status", `Load failed: ${error.message}`);
    }
}

function setStatus(elementId, message) {
    document.getElementById(elementId).textContent = message;
}

function resetGame() {
    if (game) {
        game.destroy(true);
        document.getElementById("phaser-stage").textContent = "";
    }
    initPhaser();
    setStatus("game-status", "Game reset. Press Run actions.");
}

function bindUi() {
    document.getElementById("run-actions").addEventListener("click", runWorkspaceActions);
    document.getElementById("reset-game").addEventListener("click", resetGame);
    document.getElementById("save-project").addEventListener("click", saveProject);
    document.getElementById("load-project").addEventListener("click", loadProject);
}

window.addEventListener("DOMContentLoaded", async () => {
    initPhaser();
    initBlockly();
    registerJsonLogicOperations();
    bindUi();
    await fetchPocketBaseUrl();
});
