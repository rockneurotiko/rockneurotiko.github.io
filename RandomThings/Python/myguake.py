import subprocess
# from typing import List, Iterator

# def infinite_iter(n: int = 0) -> Iterator[int]:
#     while True:
#         yield n
#         n += 1

# def get_all_index(old_i: int = 0) -> List[int]:
#     final = []
#     for i in infinite_iter():
#         resp = guake('-s', i)
#         if resp.startswith('invalid'):
#             break
#         final += i
#     guake('-s', old_i)
#     return final

# def infinite_iter(n= 0):
#     while True:
#         yield n
#         n += 1

# def get_all_index(old_i= 0):
#     final = []
#     for i in infinite_iter():
#         resp = guake('-s', i)
#         if resp.startswith('invalid'):
#             break
#         final += i
#     guake('-s', old_i)
#     return final

def actual_tab() -> None:
    # p = subprocess.Popen(['python2', '-m', 'guake.main', '-g'], stdout=subprocess.PIPE)
    p = subprocess.Popen(['ls'], stdout=subprocess.PIPE)
    out, err = p.communicate()
    if isinstance(out,bytes):
        out.split()
    print(out)

actual_tab()

# print(get_all_index(actual_tab()))