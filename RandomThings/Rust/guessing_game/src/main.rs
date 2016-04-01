extern crate rand;

use std::io;
use std::cmp::Ordering;
use rand::Rng;

fn main() {

    let secret_number = rand::thread_rng().gen_range(1, 101);

    // println!("The secret number: {}", secret_number);

    loop {
        println!("Make your guess!");

        let mut guess = String::new();

        io::stdin().read_line(&mut guess)
            .ok()
            .expect("Failed!");

        let guess: u32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => {
                println!("That's not a number");
                continue;
            }
        };


        println!("Your guess: {}", guess);

        match guess.cmp(&secret_number) {
            Ordering::Less => println!("<"),
            Ordering::Greater => println!(">"),
            Ordering::Equal => {
                println!("==");
                break;
            }
        }
    }
}
