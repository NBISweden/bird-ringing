# Associate numbers

Every actor on a license has an associate number which identifies this actor within that license.

## Uniqueness

An associate number is only unique within a license sequence (all versions of a license):

- Two actors can not share the same number in a license.
- A number that has belonged to one actor can not be given to another actor in the same license, in any version.
- The same number can exist in different licenses, and the same person can have different numbers in different licenses.

## When an associate number can be changed

The associate number is printed on the license card created for an actor. To avoid a person having different numbers on license cards from different years, the following rules apply:

- Until a license card has been created for an actor in a license, their associate number can be changed. This allows for example typos to be corrected.
- Once a license card has been created for an actor in a license, their associate number can not be changed. This also applies if the actor is removed from the license and added again later; they then keep the same number.
- When an actor who has been part of the license before is added again, the form fills in their previous number.

The rules are enforced by the API (`LicenseActorRelationSerializer`) and by the model (`LicenseRelation.clean`, which also applies to the Django admin). In the license relations form, a locked number is read-only.
