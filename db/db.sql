-- -----------------------------------------------------
-- Table `users`
-- -----------------------------------------------------

CREATE TABLE public."Users" (id serial NOT NULL, 
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "photoId" text, 
    phone text, 
    email text NOT NULL,
    PRIMARY KEY (id)) 
WITH (OIDS = FALSE);

ALTER TABLE public."Users" OWNER to postgres;

