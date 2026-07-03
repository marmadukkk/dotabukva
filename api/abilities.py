import json
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent


def _fetch_abilities_from_opendota():
    url = "https://api.opendota.com/api/constants/abilities"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "DotaBukva/1.0 (vercel)"}
    )
    with urllib.request.urlopen(req, timeout=8) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    exclude_in_key = [
        "special_bonus", "dota_", "generic", "backdoor", "necronomicon", "courier",
        "roshan", "greevil", "seasonal", "plus", "workshop", "fountain", "building",
        "neutral_", "creep", "warlock_golem", "spirit_bear", "forged_spirit", "eidolon",
        "beastmaster_boar", "lycan_wolf", "brewmaster", "visage_familiar", "shadow_demon_shadow",
        "enigma_eidolon", "ability_", "twin_gate", "capture", "lamp_use", "lotus_pool"
    ]
    bad_dname_substrings = [
        "backdoor", "true sight", "auto deliver", "return to base", "go to secret",
        "transfer item", "retrieve item", "speed burst", "empty", "placeholder",
        "aegis", "cheese"
    ]

    # User-requested blacklist of abilities to remove from reel and grid
    bad_ability_dnames = [
        "abyssal horde", "accumulation", "apex predator", "armor power", "attribure bonus", "attribute bonus",
        "black grimoire", "bladeform", "alleviation", "application da", "archer aura",
        "arm of the deep", "am of the deep", "bear down", "bear necessities", "big game hunter", "blinding sun",
        "blood magic", "blubber", "bondage", "bone and arrow", "boomstik", "boomstick", "brawler's grit",
        "break", "break of dawn", "buckshot", "bullbelly blitz", "chop shop", "chronoptic nou",
        "clairvoyant cure", "colossal", "cold snap (ad)", "chaos meteor(ad)", "congregations",
        "cutpurse", "critical strike", "dark carnival b", "dark unity", "dauntless",
        "death throe", "defilement", "destroy ofrenda", "devil's bargain", "devoured ability",
        "detonate m.a.d", "distortion field", "double trouble", "dragon sight", "duelist",
        "e.m.p. (ad)", "easy breezy", "eelskin", "eldrich summon", "eldritch summoning", "eldwurm scholar",
        "eldwurm studies", "encore", "end sharpshooter", "end meditation", "end protection",
        "end roll up", "essence of the bl", "eureka!", "event horizon", "exposure therapy",
        "fling", "fling release", "flow", "forge spirit (ad)", "fortification",
        "focus fire cancel", "fundamental fo", "galvanized", "geomancy", "gift bearer",
        "ghost walk (ad)", "gravity well", "gris-gris", "heal amplification", "healing hammer",
        "heart of battle", "heart of darkness", "herd mentality", "hidden gates", "horsepower",
        "hurricane", "hotfeet hustle", "ice wall (ad)", "icefire bomb", "immolation",
        "immovable", "intimidate", "intrinsic edge", "invading force", "invoked spell",
        "island elixir", "keen scope", "jetpack toggle", "last will", "launch snowball",
        "lurker", "magic aplification", "magic amplification", "mana break", "masochist", "mastermind", "maul",
        "mental fortitude", "might and magus", "mistwoods wayfarer", "momentum",
        "mourning ritual", "nature's profit", "nothl boon", "nyxth sense", "oblivion savant",
        "ogre smash!", "ominous discern", "one man army", "pack rat", "persecutor",
        "phantasmagoria", "pixie dust", "predator", "prickly", "prognosticate",
        "prospecting aura", "puckish", "quick wit", "rabble-rouser", "rally", "rawhide",
        "recall familliar", "recall familiar", "reflect", "m.a.d", "reins of chaos", "rewoven",
        "riverborn aura", "rugged", "ruin and restore", "ruin and restoration", "seaborn sentinel", "seed shot",
        "selemene's faithe", "selemene's faithful", "septic shock", "slithereen cutla", "slow burn", "slugger",
        "smoldering resin", "souvenir slot", "soul strike", "special reserve", "spectral",
        "spirit cairn", "spirit collector", "splitting image", "spoon's stash", "spring early",
        "squee's scope", "stollen spell", "steal weapon", "sticky fingers",
        "stop take aim", "stop sun ray", "stop rolling", "stop icarus dive", "stop freezing field",
        "succubus", "suffer in silence", "sun strike (ad)", "symmetry", "take off",
        "telekinesis land", "tendrils of the", "the shining", "third eye", "threads of fate",
        "time warp aura", "tip the scales", "to hell and back", "tomo'kan tracker",
        "tornado (ad)", "twisted chakram", "undulation", "unyielding shield", "vanquisher",
        "water bubble", "weakening aura", "wellspring",
        "attribute bonus", "boomstick", "chaos meteor (ad)", "clairvoyant curse",
        "deafening blast (ad)", "magic amplification", "recall familiar",
        "return chakram", "return chackram", "selemene's faithful", "savage roar", "stone form",
        "arm of the deep", "eldritch summoning", "ruin and restoration"
    ]

    abilities = []
    for key, ab in raw.items():
        dname = (ab.get("dname") or "").strip()
        if not dname or len(dname) < 4:
            continue
        kl = key.lower()
        if any(x in kl for x in exclude_in_key):
            continue
        dnl = dname.lower()
        if any(x in dnl for x in bad_dname_substrings):
            continue
        if "_" not in kl:
            continue
        if any(bad in dnl for bad in bad_ability_dnames):
            continue

        abilities.append({
            "en": dname,
            "ru": dname,
            "short": key,
            "attr": "ability"
        })
    abilities.sort(key=lambda x: x["en"])
    return abilities


def _get_abilities():
    try:
        live = _fetch_abilities_from_opendota()
        if live:
            return live
    except Exception:
        pass
    return []


ABILITIES = _get_abilities()


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            payload = {"abilities": ABILITIES, "count": len(ABILITIES)}
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
