from clypi import Command
from typing import override

class Switch(Command):
    target: 

    @override
    async def run(self):
        print("helper script")

if __name__ == '__main__':
    cmd = Main.parse()
    cmd.start()