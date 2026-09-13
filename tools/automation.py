from clypi import Command, Positional, arg
from typing import override, Literal
from os import path
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_FOLDER = ROOT / "manifest"
MANIFEST_EXTENSION = ROOT / "src" / "manifest.json"
CHROME = MANIFEST_FOLDER / "chrome.manifest.json"
FIREFOX = MANIFEST_FOLDER / "firefox.manifest.json"

def getJson(filepath: Path) -> dict:
    data = None
    with filepath.open("r") as file:
        data = json.load(file)
    return data

def getVersion(jsonDict: dict) -> list[int]:
    version = jsonDict["version"].split(".")
    for i in range(0, len(version)):
        version[i] = int(version[i])
    return version

def incrementVersion(manifestPath: Path, pos: str, count=1) -> None:
    data = getJson(manifestPath)
    version = getVersion(data)

    match pos:
        case "major":
            version[0] += count
        case "minor":
            version[1] += count
        case "patch":
            version[2] += count

    if version[0] < 0:
        version[0] = 0
    if version[1] < 0:
        version[1] = 0
    if version[2] < 0:
        version[2] = 0

    data["version"] = ".".join(map(str, version))
    with manifestPath.open("w+") as file:
        json.dump(data, file, indent=2)

class Increment(Command):
    position: Positional[str] = arg(help="(major|minor|patch)")
    count: Positional[int] = arg(help="Amount to increment by. Default is 1.")

    @override
    async def run(self):
        incrementVersion(MANIFEST_EXTENSION, self.position, self.count)
        for file_path in Path(MANIFEST_FOLDER).iterdir():
            if file_path.is_file():
                incrementVersion(file_path, self.position, self.count)

class Decrement(Command):
    position: Positional[str] = arg(help="(major|minor|patch)")
    count: Positional[int] = arg(help="Amount to decrement by. Default is 1.")

    @override
    async def run(self):
        incrementVersion(MANIFEST_EXTENSION, self.position, -self.count)
        for file_path in Path(MANIFEST_FOLDER).iterdir():
            if file_path.is_file():
                incrementVersion(file_path, self.position, -self.count)

class Get(Command):
    @override
    async def run(self):
        print(f"Version in manifests is: {getJson(MANIFEST_EXTENSION)["version"]}")

class Build(Command):
    target: str

    @override
    async def run(self):
        print("tba")


class Switch(Command):
    browser: Positional[str] = arg(help="(chrome|firefox) The browser to set extension manifest for.")

    @override
    async def run(self):
        match self.browser:
            case "chrome":
                with CHROME.open("r") as input:
                    with MANIFEST_EXTENSION.open("w+") as output:
                        output.write(input.read())
            case "firefox":
                with FIREFOX.open("r") as input:
                    with MANIFEST_EXTENSION.open("w+") as output:
                        output.write(input.read())
            case _:
                print("Please specify a valid browser! See switch --help.")

class Version(Command):
    subcommand: Increment | Decrement | Get

class Main(Command):
    subcommand: Switch | Version 

if __name__ == '__main__':
    cmd = Main.parse()
    cmd.start()
