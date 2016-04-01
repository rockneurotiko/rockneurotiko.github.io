#!/usr/bin/env python3
import typing
from typing import Tuple, List, Dict, Set, Union
from collections import defaultdict
import click

COLORES = {"ALTA": '\033[91m',
           "MEDIA": '\033[93m',
           "BAJA": '\033[94m',
           "RESET": '\033[0m',
           "OK": '\033[92m',
           "HEADER": '\033[95m'}

PRIOR_NAMES = ["ALTA", "MEDIA", "BAJA"]

# mypy complains here :'(
# PRIORIDADES_DB = {x:[] for x in PRIOR_NAMES}  # type: Dict[str,List[int]]

# Here mypy not complains
PRIORIDADES_DB = {"ALTA": [],
                  "MEDIA": [],
                  "BAJA": []}  # type: Dict[str,List[int]]
FILE = ".db.todo"
HILOS = defaultdict(lambda: [])  # type: Dict[str,List[int]]
TAREAS = {}  # type: Dict[int, str]

# mypy complains of this magic :'(
# def except_generator(name_excp):
#     """That's an except generator function"""
#     return type(name_excp, (Exception,),
#         {'__init__':lambda self, msg: Exception.__init__(self, msg)})


class ParseException(Exception):

    def __init__(self, msg):
        Exception.__init__(self, msg)


def log_warning(msg: str) -> None:
    print("WARNING: {}".format(msg))


def save_tarea(id: int, prior: str, hilo: str, tarea: str) -> None:
    if id == -1:
        id = max(TAREAS) + 1
    PRIORIDADES_DB[prior] += [id]
    HILOS[hilo] += [id]
    TAREAS[id] = format_tarea(prior, hilo, tarea)


def load_file(file_name: str) -> None:
    lines = read_from_file(file_name)
    for i, value in enumerate(lines):
        try:
            if value == '\n':  # Ignore new lines :-)
                print("WARNING: you have an empty line in line {}".format(i))
                continue
            tarea = parse_tarea(value)
            save_tarea(int(i), *tarea)
        except ParseException as e:
            log_warning("{} is not a valid TODO: {}".format(value, e))


def check_params(prior: str, hilo: str) -> None:
    if not prior in PRIORIDADES_DB.keys():
        raise ParseException("Error in priority {}".format(prior))
    if not hilo.isalnum():
        raise ParseException("Error in thread {}".format(hilo))


def parse_tarea(linea: str) -> Tuple[str, str, str]:
    lineas = linea.split(":")
    if len(lineas) < 3:
        print("Fail parse")
        raise Exception("Fail parse wei!")
    prior, hilo, tarea = lineas[0], lineas[1], ':'.join(lineas[2:])
    check_params(prior, hilo)
    if tarea[-1] == '\n':
        tarea = tarea[:-1]
    return prior, hilo, tarea


def format_tarea(prior: str, hilo: str, tarea: str) -> str:
    check_params(prior, hilo)
    return "{}:{}:{}".format(prior, hilo, tarea)


def existe_tarea(prior: str, hilo: str, tarea: str) -> bool:
    tareas_hilo = HILOS.get(hilo)
    if not tareas_hilo:
        return False
    filtrados = list(
        map(parse_tarea, map(lambda x: TAREAS.get(x), tareas_hilo)))
    ids_posibles = list(
        filter(lambda x: parse_tarea(TAREAS.get(x)) in filtrados, tareas_hilo))
    filtrados = list(filter(lambda x: x[2] == tarea, filtrados))
    if len(filtrados) == 0:
        return False
    if len(filtrados) > 1:
        print("WTF? mas de uno con distinta prioridad")
    test_tarea = filtrados[0]
    if prior == test_tarea[0]:
        return True
    else:
        print("Distintas prioridades, misma tarea, quizas querias usar -s")
        return True


def write_new_tarea(prior: str, hilo: str, tarea: str) -> None:
    format = format_tarea(prior, hilo, tarea)
    with open(FILE, 'a') as f:
        f.write('\n')
        f.write(format)


def update_file(id: int, prior: str, hilo: str, tarea: str) -> None:
    if id == -1:
        write_new_tarea(prior, hilo, tarea)
    else:
        pass


def modificar(id: int, tarea: str, add_priority: str = "", add_thread: str = "") -> None:
    tarea_local = TAREAS.get(id)
    if not tarea_local:
        print_with_color("ID: {} not exist.".format(id), COLORES.get("ALTA"))
        return
    tarea_format = parse_tarea(tarea_local)
    if not add_priority and not add_thread and tarea == tarea_format[2]:
        # No hay cambios
        return

    prior = add_priority if (
        add_priority and add_priority != tarea_format[0]) else tarea_format[0]
    thread = add_thread if (
        add_thread and add_thread != tarea_format[1]) else tarea_format[1]
    tarea_f = "{}\n".format(tarea) if (
        tarea != tarea_format[2]) else tarea_format[2]

    content = read_from_file(FILE)
    content[id] = format_tarea(prior, thread, tarea_f)
    print(content)
    write_to_file(FILE, content)


def tarea_add(tarea: str, prior: str, hilo: str) -> None:
    if not prior:
        prior = "BAJA"
    if not hilo:
        hilo = "TODO"
    if not existe_tarea(prior, hilo, tarea):
        save_tarea(-1, prior, hilo, tarea)
        update_file(-1, prior, hilo, tarea)
    else:
        print("Parece que la tarea ya existia, no la voy a añadir :-)")


def clean_file() -> None:
    content = read_from_file(FILE)
    content_clean = list(filter(lambda x: x != "\n", content))
    if content_clean != content:
        write_to_file(FILE, content_clean)


def print_help(ctx, param, value):
    if not value:
        return
    print("Version")
    ctx.exit()


def parse(ctx, param, value):
    if not value:
        return
    # Comprobar que el fichero exista
    # Si no, crear?
    # FILE = value
    clean_file()
    load_file(value)


def print_with_color(msg: str, color: str) -> None:
    print("{}{}{}".format(color, msg, COLORES.get("RESET")))


def print_all_tareas(tareas: List[Tuple[int, Tuple[str, str, str]]], prior: str) -> None:
    if not tareas:
        return
    color = COLORES.get(prior)
    print_with_color("[{}]".format(prior), color)
    for id, tarea in tareas:
        color = COLORES.get(tarea[0])
        print_with_color("({}) {}".format(id, tarea[2]), color)
    print()


# List[Dict[str, Union[Tuple[str, str, str],int]]]) -> None:
def print_by_prior(tareas_id: List[int]) -> None:
    tareas = list(map(parse_tarea, [TAREAS.get(x) for x in tareas_id]))
    tareas_zip = list(zip(tareas_id, tareas))
    for prior in PRIOR_NAMES:
        lista = [(id, tarea) for id, tarea in tareas_zip if tarea[0] == prior]
        if lista:
            print_all_tareas(lista, prior)


def print_hilo(hilo_name: str) -> None:
    idL = HILOS.get(hilo_name)
    if not idL:
        print_with_color(
            "No existe el hilo \"{}\" putilla!".format(hilo_name), COLORES.get("ALTA"))
        return
    header = COLORES.get("HEADER")
    reset = COLORES.get("RESET")
    print_with_color(
        "{}\n|{}|\n{}\n".format("-" * 15, hilo_name, "-" * 15), header)
    # tareas = [ {'id': x, 'tarea':parse_tarea(TAREAS.get(x))} for x in idL]
    # # type: List[Dict[str, Union[Tuple[str, str, str],int]]]
    print_by_prior(idL)
    print()


def remove_from_local_db(id: int) -> None:
    tarea = TAREAS.get(id)
    TAREAS.pop(id)
    prior, hilo, _ = parse_tarea(tarea)
    # mutable... caca!
    PRIORIDADES_DB[prior].remove(id)
    HILOS[hilo].remove(id)


def read_from_file(file_name: str) -> List[str]:
    content = []  # type: List[str]
    with open(file_name, 'r') as f:
        content = f.readlines()
    return content


def write_to_file(file_name: str, lista: List[str]) -> None:
    with open(file_name, 'w') as f:
        f.writelines(lista)


def remove_tarea(id: int) -> None:
    prior, hilo, _ = parse_tarea(TAREAS[id])
    archivo = []  # type: List[str]
    if not id in TAREAS:
        print_with_color(
            "No hay tarea con id {}".format(id), COLORES.get("ALTA"))
        return
    clean_file()
    archivo = read_from_file(FILE)
    archivo = archivo[:id] + archivo[id + 1:]
    write_to_file(FILE, archivo)
    remove_from_local_db(id)


def print_thread_names() -> None:
    for thread in HILOS:
        print_with_color("{}".format(thread), COLORES.get("HEADER"))


def print_tareas() -> None:
    for hilo_name in HILOS:
        print_hilo(hilo_name)


@click.command(context_settings=dict(help_option_names=['-h', '--help']))
@click.option('--file', '-f', default=FILE, callback=parse, expose_value=False)
@click.option('--add', '-a', 'add_tarea')
@click.option('--priority', '-p', 'add_priority', type=click.Choice(PRIOR_NAMES))
@click.option('--thread', '-t', 'add_thread')
@click.option('--list', '-l', 'show_thread_names', is_flag=True)
@click.option('--by-thread', '-w', 'show_thread')
@click.option('--remove', '-r', 'remove_id')
@click.option('--modify', '-m', 'modify_tarea', nargs=2)
def main(add_tarea: str, add_priority: str, add_thread: str,
         show_thread: str, show_thread_names: bool, remove_id: str,
         modify_tarea: Tuple[str, str]) -> None:
    if not any([add_tarea, add_priority, add_thread, show_thread, show_thread_names, remove_id, modify_tarea]):
        print_tareas()
        clean_file()
    elif not any([add_tarea, modify_tarea]) and any([add_priority, add_thread]):
        print_with_color(
            "ERROR: -t and -p go with -a or -s", COLORES.get("ALTA"))
        # exit(1)
    elif add_tarea:
        tarea_add(add_tarea, add_priority, add_thread)
    elif show_thread_names:
        print_thread_names()
    elif show_thread:
        print_hilo(show_thread)
    elif remove_id:
        if not remove_id.isdecimal():
            print_with_color("La tarea debe ser un numero, no como {}".format(remove_id),
                             COLORES.get("ALTA"))
            return
        id = int(remove_id)
        remove_tarea(id)
    elif modify_tarea:
        if not modify_tarea[0].isdecimal():
            print_with_color("La tarea debe ser un numero, no como {}".format(modify_tarea[0]),
                             COLORES.get("ALTA"))
            return
        id = int(modify_tarea[0])
        tarea = modify_tarea[1]
        modificar(id, tarea, add_priority, add_thread)

if __name__ == '__main__':
    main()
    # This is to mypy not complain XD
    # main('', '', '', '', False, '',('',''))
