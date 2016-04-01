extern crate rand;

use std::thread;
use std::sync::{Mutex, Arc};
use rand::Rng;

struct Philosopher {
    name: String,
    left: usize,
    right: usize,
}

impl Philosopher {
    fn new(name: &str, left: usize, right: usize) -> Philosopher {
        Philosopher {
            name: name.to_string(),
            left: left,
            right: right,
        }
    }

    fn eat(self, table: &Table) {
        let _left = table.forks[self.left].lock();
        let _right = table.forks[self.right].lock();

        let randsleep = rand::thread_rng().gen_range(1000, 1500);
        println!("{} is eating for {} ms!", self.name, randsleep);

        thread::sleep_ms(randsleep);

        println!("{} is done eating!", self.name)
    }
}

struct Table {
    forks: Vec<Mutex<()>>,
}

fn main() {
    let table = Arc::new(Table { forks: vec![
        Mutex::new(()),
        Mutex::new(()),
        Mutex::new(()),
        Mutex::new(()),
        Mutex::new(()),
        ]});

    let philosophers = vec![
        Philosopher::new("Mijail Bakunin", 0, 1),
        Philosopher::new("Gilles Deleuze", 1, 2),
        Philosopher::new("Karl Marx", 2, 3),
        Philosopher::new("Friedrich Nietzsche", 3, 4),
        Philosopher::new("Michel Foucault", 4, 0),
        ];

    let handles: Vec<_> = philosophers.into_iter().map(|p| {
        let table = table.clone();
        thread::spawn(move || {
            p.eat(&table);
        })
    }).collect();

    for h in handles {
        h.join().unwrap();
    }
}
